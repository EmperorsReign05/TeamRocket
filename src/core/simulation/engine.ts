import type { Position, RobotState, RobotStatus, Task, WorldState } from "../types";
import { computeCongestion, isTraversable } from "../map/warehouse";
import { positionsEqual } from "../map/graph";
import { planPath } from "../pathfinding/astar";
import { resolvePIBT } from "../pathfinding/pibt";

// One discrete simulation tick:
//   1. work out which robots need a route, (re)plan those with A*
//   2. hand every robot's intended next step to PIBT
//   3. apply PIBT's resolved moves simultaneously (every robot reads
//      pre-tick state; nobody sees a partially-updated tick in progress)
//   4. update path progress, base priority, and status from the outcome
//   5. mechanical pickup/dropoff arrival bookkeeping
//   6. recompute the congestion field from the new robot positions
//   7. accumulate this tick's PIBT/A* activity into world.metrics
//
// A robot's "goal" is derived only from fields the existing contract
// already has (task pickup/dropoff, robot.home) — no task auction/bidding
// logic here, just "where is this robot currently trying to go."

const BASE_PRIORITY_RESET = 0;

// A robot with a task is en route to the pickup while its task isn't
// "in_progress" yet, and en route to the dropoff once it is. Arrival at
// each point (see applyArrivals) is what flips that status.
function resolveGoal(robot: RobotState, tasks: Task[]): Position | null {
  if (!robot.currentTaskId) {
    return positionsEqual(robot.position, robot.home) ? null : robot.home;
  }
  const task = tasks.find((t) => t.id === robot.currentTaskId);
  if (!task) return null;
  return task.status === "in_progress" ? task.dropoff : task.pickup;
}

function pathGoal(path: Position[]): Position | null {
  return path.length > 0 ? path[path.length - 1] : null;
}

// Replan only when it actually matters (new/changed goal, or the next step
// of the current route is no longer usable) — NOT just because congestion
// shifted by one robot. Constant replanning on every congestion tick causes
// route thrashing; a committed path stays committed until it's stale.
function needsReplan(robot: RobotState, goal: Position, world: WorldState): boolean {
  const currentGoal = pathGoal(robot.path);
  if (!currentGoal || !positionsEqual(currentGoal, goal)) return true;
  if (robot.path.length > 1 && !isTraversable(robot.path[1], world.map)) return true;
  return false;
}

function planRoutes(state: WorldState): { robots: RobotState[]; replans: number } {
  let replans = 0;

  const robots = state.robots.map((robot) => {
    if (robot.status === "failed") return robot;

    const goal = resolveGoal(robot, state.tasks);
    if (!goal) {
      return robot.path.length > 0 ? { ...robot, path: [] } : robot;
    }

    if (!needsReplan(robot, goal, state)) return robot;

    const result = planPath(robot.position, goal, state);
    replans += 1;
    return { ...robot, path: result.found ? result.path : [] };
  });

  return { robots, replans };
}

function deriveIdleOrTravelingStatus(atGoal: boolean, moved: boolean): RobotStatus {
  if (atGoal) return "idle";
  return moved ? "moving" : "waiting";
}

// Mechanical "did the robot physically reach the pickup/dropoff cell it was
// heading to" bookkeeping — not task assignment or bidding. A robot picking
// up or dropping off flips the task's lifecycle status and, on dropoff,
// releases the robot back to idle. T-104-style pending tasks with no
// assignedRobotId are simply never touched here (out of scope: auction).
function applyArrivals(
  robots: RobotState[],
  tasks: Task[],
  movedById: Map<string, boolean>
): { robots: RobotState[]; tasks: Task[] } {
  const tasksById = new Map(tasks.map((t) => [t.id, { ...t }]));

  const nextRobots = robots.map((robot): RobotState => {
    if (robot.status === "failed") return robot;

    const moved = movedById.get(robot.id) ?? false;

    if (!robot.currentTaskId) {
      const atHome = positionsEqual(robot.position, robot.home);
      return { ...robot, status: deriveIdleOrTravelingStatus(atHome, moved) };
    }

    const task = tasksById.get(robot.currentTaskId);
    if (!task) {
      return { ...robot, currentTaskId: undefined, status: "idle" };
    }

    if (task.status !== "in_progress" && positionsEqual(robot.position, task.pickup)) {
      task.status = "in_progress";
      return { ...robot, status: "assigned" };
    }

    if (task.status === "in_progress" && positionsEqual(robot.position, task.dropoff)) {
      task.status = "completed";
      return { ...robot, currentTaskId: undefined, status: "idle" };
    }

    return { ...robot, status: moved ? "moving" : "waiting" };
  });

  return { robots: nextRobots, tasks: Array.from(tasksById.values()) };
}

export function stepSimulation(state: WorldState): WorldState {
  const { robots: routedRobots, replans } = planRoutes(state);
  const worldForPibt: WorldState = { ...state, robots: routedRobots };

  const { moves, metrics: tickMetrics } = resolvePIBT(routedRobots, worldForPibt);
  const moveByRobot = new Map(moves.map((m) => [m.robotId, m]));
  const movedById = new Map(moves.map((m) => [m.robotId, !positionsEqual(m.from, m.to)]));

  const movedRobots = routedRobots.map((robot): RobotState => {
    const move = moveByRobot.get(robot.id);
    if (!move) return robot;

    const moved = !positionsEqual(move.from, move.to);
    if (!moved) {
      // Waiting doesn't invalidate a still-valid committed route, and
      // shouldn't be treated as "failing to progress" if the robot had
      // nothing to do in the first place.
      const priority =
        robot.status !== "failed" && robot.path.length > 1 ? robot.priority + 1 : robot.priority;
      return { ...robot, priority };
    }

    const followedPlan = robot.path.length > 1 && positionsEqual(robot.path[1], move.to);
    // If PIBT pushed this robot onto a cell its own A* route didn't
    // anticipate, that route is now stale — drop it so planRoutes replans
    // cleanly next tick instead of continuing along an invalid path.
    const path = followedPlan ? robot.path.slice(1) : [];

    const priority = path.length <= 1 ? BASE_PRIORITY_RESET : robot.priority;

    return { ...robot, position: move.to, path, priority };
  });

  const { robots, tasks } = applyArrivals(movedRobots, state.tasks, movedById);
  const map = computeCongestion(state.map, robots);

  return {
    ...state,
    tick: state.tick + 1,
    map,
    robots,
    tasks,
    metrics: {
      replans: state.metrics.replans + replans,
      conflictCount: state.metrics.conflictCount + tickMetrics.conflictCount,
      waitMoves: state.metrics.waitMoves + tickMetrics.waitMoves,
      inheritedPriorities: state.metrics.inheritedPriorities + tickMetrics.inheritedPriorities,
      backtracks: state.metrics.backtracks + tickMetrics.backtracks,
    },
  };
}
