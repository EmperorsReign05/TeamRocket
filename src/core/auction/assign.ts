import type { RobotState, Task, WorldState } from "../types";
import { calculateBid, type RobotBid } from "./cost";

// A robot is only eligible to WIN a new task right now if it isn't already
// committed to one — RobotState currently tracks a single currentTaskId,
// so a busy robot has nowhere to hold a second assignment yet. Busy
// robots are excluded from bidding entirely here rather than allowed to
// "win and queue" — nothing downstream can act on that until a real task
// queue is wired onto RobotState.
function isEligible(robot: RobotState): boolean {
  return robot.status !== "failed" && !robot.currentTaskId;
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
