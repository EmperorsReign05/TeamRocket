import type { RobotState, Task, WorldState } from "../types";
import { calculateBid, type RobotBid } from "./cost";
import { MIN_BATTERY_TO_BID_PERCENT } from "../simulation/robotModels";

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
  // Strictly less than the cap: a robot AT the cap must not be allowed to
  // accept one more, or winning would push it to cap + 1. This is the
  // pre-acceptance check, so it has to leave room for the task it's about
  // to win.
  //
  // "charging" is excluded outright — once the engine has given up on
  // letting a depleted robot keep losing bids and sent it to dock (see
  // robotModels.ts's needsToCharge), it's out of the pool until it's back
  // to idle with a working charge again.
  //
  // The battery floor is a hard, immediate cutoff — independent of
  // whether the robot has accumulated a losing streak yet. Below it, a
  // robot simply does not bid, full stop.
  return (
    robot.status !== "failed" &&
    robot.status !== "charging" &&
    robot.battery >= MIN_BATTERY_TO_BID_PERCENT &&
    queueLength < MAX_QUEUED_TASKS
  );
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

// Keeps every eligible robot's lowBatteryStreak current after a task has
// been auctioned: winning resets it to 0, losing specifically because of
// battery infeasibility (bid.infeasibleReason === "battery" — never
// because of an overweight task, an unreachable route, or simply being
// outbid) increments it, anything else leaves it untouched. Losing to a
// cheaper robot — or to a task nobody could ever carry — isn't
// "struggling", so it shouldn't count toward being sent to charge.
//
// Whoever orchestrates the auction loop (a hook, a dispatcher tick — not
// built yet) is expected to call this once per task alongside assignTask,
// same input, passing back in the winner it picked.
export function updateLowBatteryStreaks(
  robots: RobotState[],
  task: Task,
  world: WorldState,
  winnerId: string | null
): RobotState[] {
  return robots.map((robot) => {
    if (!isEligible(robot)) return robot;
    if (robot.id === winnerId) {
      return robot.lowBatteryStreak ? { ...robot, lowBatteryStreak: 0 } : robot;
    }
    const bid = calculateBid(robot, task, world);
    if (bid.infeasibleReason === "battery") {
      return { ...robot, lowBatteryStreak: (robot.lowBatteryStreak ?? 0) + 1 };
    }
    return robot;
  });
}
