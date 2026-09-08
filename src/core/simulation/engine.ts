import type { Position, RobotState, RobotStatus, Task, WorldState } from "../types";
import { CHARGING_STATIONS, computeCongestion, isTraversable } from "../map/warehouse";
import { manhattanDistance, positionsEqual } from "../map/graph";
import { planPath } from "../pathfinding/astar";
import { resolvePIBT } from "../pathfinding/pibt";
import { BATTERY_PERCENT_PER_CELL, CHARGE_PERCENT_PER_TICK, RECHARGE_TARGET_PERCENT, needsToCharge } from "./robotModels";

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

function nearestChargingStation(position: Position): Position {
  let best = CHARGING_STATIONS[0].position;
  let bestDist = manhattanDistance(position, best);
  for (const station of CHARGING_STATIONS.slice(1)) {
    const dist = manhattanDistance(position, station.position);
    if (dist < bestDist) {
      bestDist = dist;
      best = station.position;
    }
  }
  return best;
}

function isAtChargingStation(position: Position): boolean {
  return CHARGING_STATIONS.some((station) => positionsEqual(station.position, position));
}

// A robot that has given up on winning bids (see robotModels.ts's
// needsToCharge) and is otherwise free of work gets pulled out of service
// and sent to dock — but only if it isn't already committed to something.
// Interrupting an in-progress task or an already-queued backlog to force a
// charge isn't part of this: the trigger only ever fires for a robot that
// was already idle and simply couldn't win anything.
function applyChargingTriggers(robots: RobotState[]): RobotState[] {
  return robots.map((robot) => {
    if (robot.status === "failed" || robot.status === "charging") return robot;
    const hasNoWork = !robot.currentTaskId && (robot.queuedTaskIds?.length ?? 0) === 0;
    if (hasNoWork && needsToCharge(robot)) {
      return { ...robot, status: "charging" };
    }
    return robot;
  });
}

// A robot with a task is en route to the pickup while its task isn't
// "in_progress" yet, and en route to the dropoff once it is. Arrival at
// each point (see applyArrivals) is what flips that status. A charging
// robot heads for its nearest station and has no goal once it arrives —
// applyArrivals handles the actual recharge from there.
function resolveGoal(robot: RobotState, tasks: Task[]): Position | null {
  if (robot.status === "charging") {
    return isAtChargingStation(robot.position) ? null : nearestChargingStation(robot.position);
  }
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

// When a robot's current task ends (completed, or its reference went
// stale), pull the next task off its queue rather than leaving it idle
// with a backlog nobody ever acts on — otherwise queuedTaskIds is just
// bidding-eligibility bookkeeping that never actually executes.
function promoteFromQueue(
  robot: RobotState
): Pick<RobotState, "currentTaskId" | "queuedTaskIds" | "status"> {
  const queue = robot.queuedTaskIds ?? [];
  if (queue.length === 0) {
    return { currentTaskId: undefined, queuedTaskIds: queue, status: "idle" };
  }
  const [next, ...rest] = queue;
  return { currentTaskId: next, queuedTaskIds: rest, status: "assigned" };
}

// Mechanical "did the robot physically reach the pickup/dropoff cell it was
// heading to" bookkeeping — not task assignment or bidding. A robot picking
// up or dropping off flips the task's lifecycle status; on dropoff it pulls
// its next task off queuedTaskIds if it has one queued, otherwise goes
// idle. Tasks with no assignedRobotId (never won an auction) are simply
// never touched here (out of scope: auction itself). A charging robot is
// handled separately: no task lifecycle applies to it, just recharge and
// release once it's back to a working charge.
function applyArrivals(
  robots: RobotState[],
  tasks: Task[],
  movedById: Map<string, boolean>
): { robots: RobotState[]; tasks: Task[] } {
  const tasksById = new Map(tasks.map((t) => [t.id, { ...t }]));

  const nextRobots = robots.map((robot): RobotState => {
    if (robot.status === "failed") return robot;

    if (robot.status === "charging") {
      if (!isAtChargingStation(robot.position)) return robot; // still traveling there
      // Opportunity charging: leave once back at RECHARGE_TARGET_PERCENT,
      // not necessarily 100% — see that constant's comment for why. Check
      // the POST-increment value: a robot that crosses the target this
      // tick should leave charging status this same tick, not one tick
      // later once something else notices it's already there.
      const battery = Math.min(100, robot.battery + CHARGE_PERCENT_PER_TICK);
      if (battery >= RECHARGE_TARGET_PERCENT) {
        return { ...robot, battery, status: "idle", lowBatteryStreak: 0 };
      }
      return { ...robot, battery };
    }

    const moved = movedById.get(robot.id) ?? false;

    if (!robot.currentTaskId) {
      const atHome = positionsEqual(robot.position, robot.home);
      return { ...robot, status: deriveIdleOrTravelingStatus(atHome, moved) };
    }

    const task = tasksById.get(robot.currentTaskId);
    if (!task) {
      return { ...robot, ...promoteFromQueue(robot) };
    }

    if (task.status !== "in_progress" && positionsEqual(robot.position, task.pickup)) {
      task.status = "in_progress";
      return { ...robot, status: "assigned" };
    }

    if (task.status === "in_progress" && positionsEqual(robot.position, task.dropoff)) {
      task.status = "completed";
      return { ...robot, ...promoteFromQueue(robot) };
    }

    return { ...robot, status: moved ? "moving" : "waiting" };
  });

  return { robots: nextRobots, tasks: Array.from(tasksById.values()) };
}

export function stepSimulation(state: WorldState): WorldState {
  const chargingState: WorldState = { ...state, robots: applyChargingTriggers(state.robots) };

  const { robots: routedRobots, replans } = planRoutes(chargingState);
  const worldForPibt: WorldState = { ...chargingState, robots: routedRobots };

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

    // Actually drain battery on real movement — otherwise the auction's
    // battery-sufficiency check evaluates every bid against a number that
    // never changes, and a robot could win task after task forever without
    // ever looking any less charged than the moment it was seeded.
    const battery = Math.max(0, robot.battery - BATTERY_PERCENT_PER_CELL);

    return { ...robot, position: move.to, path, priority, battery };
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
