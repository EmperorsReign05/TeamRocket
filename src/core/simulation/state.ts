import type { WorldState } from "../types";

// Contract only — NOT implemented. This is the simulation owner's file.
//
// Move whatever mock robot/task seed data currently lives in page.tsx into
// this function. It should use createWarehouseMap() from
// src/core/map/warehouse.ts as the map's single source of truth.

export function createInitialWorld(): WorldState {
  throw new Error("createInitialWorld is not implemented yet — see src/core/simulation/state.ts");
}
