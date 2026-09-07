import type { Position, WarehouseMap } from "../types";
import { isTraversable } from "./warehouse";

// Generic grid-graph helpers shared by A* and PIBT. Orthogonal movement only.

const DIRECTIONS: Position[] = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 }, // right
];

export function getNeighbors(position: Position, map: WarehouseMap): Position[] {
  const neighbors: Position[] = [];
  for (const dir of DIRECTIONS) {
    const next: Position = { x: position.x + dir.x, y: position.y + dir.y };
    if (isTraversable(next, map)) {
      neighbors.push(next);
    }
  }
  return neighbors;
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}
