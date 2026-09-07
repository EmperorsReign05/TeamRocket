import type { RobotState, Task, WorldState } from "../types";
import { calculateBid, type RobotBid } from "./cost";

// A robot may still be busy and bid on more work — it just can't take on
// an unbounded backlog. Eligible = not broken, and its queue (tasks
// waiting behind whatever it's currently doing) isn't already full.
//
// Note: calculateBid's ETA/workload math currently only accounts for the
// robot's active route (currentTaskId's remaining path), not for however
// many tasks are already queued behind it — a robot with a deep backlog
// will look faster than it really is until queued tasks carry their own
// duration estimate. Flagging this rather than leaving it silently wrong.
const MAX_QUEUED_TASKS = 4;

function isEligible(robot: RobotState): boolean {
  const queueLength = robot.queuedTaskIds?.length ?? 0;
  return robot.status !== "failed" && queueLength <= MAX_QUEUED_TASKS;
}

// All feasible bids for a task, unordered. Useful on its own for
// dashboard/debug display of who's in the running and why.
export function getBiddingRobots(task: Task, robots: RobotState[], world: WorldState): RobotBid[] {
  return robots
    .filter(isEligible)
    .map((robot) => calculateBid(robot, task, world))
    .filter((bid) => bid.feasible);
}

// Every bid, including infeasible ones (totalCost/eta = Infinity) — for
// diagnostics: "why didn't robot X bid on this task."
export function getAllBids(task: Task, robots: RobotState[], world: WorldState): RobotBid[] {
  return robots.map((robot) => calculateBid(robot, task, world));
}

// Lowest totalCost wins; ties break deterministically by robotId so
// identical input always produces identical output.
export function assignTask(task: Task, robots: RobotState[], world: WorldState): RobotBid | null {
  const bids = getBiddingRobots(task, robots, world);

  let best: RobotBid | null = null;
  for (const bid of bids) {
    if (
      best === null ||
      bid.totalCost < best.totalCost ||
      (bid.totalCost === best.totalCost && bid.robotId < best.robotId)
    ) {
      best = bid;
    }
  }
  return best;
}
