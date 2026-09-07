import type { Position, WorldState } from "../types";

// Contract only — NOT implemented. This is the A* owner's file.
//
// Intended edge cost: base movement cost + current congestion penalty
// (read from world.map cells via src/core/map/warehouse.ts's getCell).
// Manhattan distance (src/core/map/graph.ts) is an admissible heuristic for
// this orthogonal grid — no need to overengineer beyond that.
//
// Must stay deterministic: identical (start, goal, world) in -> identical
// PathResult out.

export type PathResult = {
  path: Position[];

  distance: number;
  congestionCost: number;
  eta: number;

  found: boolean;
};

export function planPath(start: Position, goal: Position, world: WorldState): PathResult {
  void start;
  void goal;
  void world;
  throw new Error("planPath is not implemented yet — see src/core/pathfinding/astar.ts");
}
