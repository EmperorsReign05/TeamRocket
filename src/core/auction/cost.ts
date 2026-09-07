import type { RobotState, Task, WorldState } from "../types";

// Contract only — NOT implemented. This is the auction owner's file.
//
// A bid's eta/travelCost/congestionCost are expected to come from
// src/core/pathfinding/astar.ts's planPath(robot.position, task.pickup, ...)
// plus planPath(task.pickup, task.dropoff, ...) — the auction depends on
// pathfinding, not the other way around. Keep the formula simple to start;
// this does not need to be the final bidding model on day one.

export type RobotBid = {
  robotId: string;
  taskId: string;

  eta: number;

  travelCost: number;
  congestionCost: number;
  workloadCost: number;

  totalCost: number;
};

export function calculateBid(robot: RobotState, task: Task, world: WorldState): RobotBid {
  void robot;
  void task;
  void world;
  throw new Error("calculateBid is not implemented yet — see src/core/auction/cost.ts");
}
