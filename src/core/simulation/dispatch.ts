import type { WorldState } from "../types";
import { assignTask, updateLowBatteryStreaks } from "../auction/assign";
import { stepSimulation } from "./engine";

// Cap on how many pending tasks one dispatch round evaluates, oldest
// first. Real fleet volume from the UI is tiny, but this is a cheap safety
// bound against a pathologically large backlog ever making one tick slow —
// worked out and stress-tested in tests/integration-stress.test.ts before
// landing here as the real implementation.
const MAX_TASKS_PER_DISPATCH_ROUND = 30;

// Runs the auction against the oldest pending tasks and applies winning
// bids onto robots/tasks: the winner either takes the task directly (if
// idle) or gets it added to its queue (if already busy but has room — see
// assign.ts's isEligible). Every eligible robot's lowBatteryStreak is kept
// current in the same pass, which is what eventually pulls a struggling
// robot out of service to recharge (see robotModels.ts's needsToCharge).
function runAuctionRound(world: WorldState): WorldState {
  let robots = world.robots;
  let tasks = world.tasks;

  const upForAuction = tasks.filter((t) => t.status === "pending").slice(0, MAX_TASKS_PER_DISPATCH_ROUND);
  for (const task of upForAuction) {
    const winner = assignTask(task, robots, { ...world, robots, tasks });
    robots = updateLowBatteryStreaks(robots, task, { ...world, robots, tasks }, winner?.robotId ?? null);
    if (!winner) continue; // infeasible for everyone, or every eligible robot's queue is full

    robots = robots.map((r) => {
      if (r.id !== winner.robotId) return r;
      if (!r.currentTaskId) {
        return { ...r, currentTaskId: task.id, status: "assigned" as const };
      }
      return { ...r, queuedTaskIds: [...(r.queuedTaskIds ?? []), task.id] };
    });

    tasks = tasks.map((t) =>
      t.id === task.id ? { ...t, status: "assigned" as const, assignedRobotId: winner.robotId } : t
    );
  }

  return { ...world, robots, tasks };
}

// The one function a UI needs to drive the whole backend: auctions
// whatever's pending, applies the results, then advances the simulation by
// one tick. Call this instead of stepSimulation directly and every
// pending task actually gets evaluated by the full battery/payload/
// congestion/deadline-aware auction rather than sitting there forever (or
// being assigned by ad hoc "grab the first idle robot" logic).
export function runDispatchTick(world: WorldState): WorldState {
  return stepSimulation(runAuctionRound(world));
}
