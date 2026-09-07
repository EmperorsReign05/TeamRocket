import type { WorldState } from "../types";

// Contract only — NOT implemented. This is the simulation owner's file.
//
// Intended flow per tick: PIBT resolves safe next moves from each robot's
// current path (src/core/pathfinding/pibt.ts), the engine applies them and
// advances task/robot lifecycle state. UI renders this; UI does not own
// fleet logic.

export function stepSimulation(state: WorldState): WorldState {
  void state;
  throw new Error("stepSimulation is not implemented yet — see src/core/simulation/engine.ts");
}
