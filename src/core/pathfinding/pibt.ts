import type { Position, RobotState, WorldState } from "../types";

// Contract only — NOT implemented. This is the PIBT owner's file.
//
// PIBT's job is NOT global path generation — A* already gave each robot an
// intended path (robot.path). PIBT decides which robots may safely take the
// next step toward their intended path this tick when multiple robots want
// conflicting cells.
//
// Whatever the implementation, the result must guarantee:
//   - two robots never move into the same destination cell
//   - a direct swap (A -> B's cell, B -> A's cell in the same tick) never
//     happens
//   - a robot never moves onto a blocked cell
//   - a failed robot never moves
//   - result is deterministic for identical input
//
// Flow: A* generates intended paths -> PIBT resolves next-step conflicts ->
// simulation applies the resulting moves.

export type PlannedMove = {
  robotId: string;
  from: Position;
  to: Position;
};

export function resolvePIBT(robots: RobotState[], world: WorldState): PlannedMove[] {
  void robots;
  void world;
  throw new Error("resolvePIBT is not implemented yet — see src/core/pathfinding/pibt.ts");
}
