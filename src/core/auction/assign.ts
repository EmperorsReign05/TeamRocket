import type { RobotState, Task, WorldState } from "../types";
import type { RobotBid } from "./cost";

// Contract only — NOT implemented. This is the auction owner's file.
//
// Lowest valid totalCost wins. Ties should break deterministically (e.g. by
// robotId) so identical input always produces identical output.

export function assignTask(task: Task, robots: RobotState[], world: WorldState): RobotBid | null {
  void task;
  void robots;
  void world;
  throw new Error("assignTask is not implemented yet — see src/core/auction/assign.ts");
}
