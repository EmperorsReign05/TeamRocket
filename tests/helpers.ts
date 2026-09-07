import type { Cell, Position, RobotState, Task, WarehouseMap, WorldState } from "../src/core/types";
import type { PlannedMove } from "../src/core/pathfinding/pibt";

export function makeMap(width: number, height: number, blocked: Position[] = []): WarehouseMap {
  const blockedKeys = new Set(blocked.map((p) => `${p.x},${p.y}`));
  const cells: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ position: { x, y }, blocked: blockedKeys.has(`${x},${y}`), congestion: 0 });
    }
  }
  return { width, height, cells };
}

export function withCongestion(map: WarehouseMap, congestion: Record<string, number>): WarehouseMap {
  return {
    ...map,
    cells: map.cells.map((c) => ({
      ...c,
      congestion: congestion[`${c.position.x},${c.position.y}`] ?? c.congestion,
    })),
  };
}

export function makeRobot(
  overrides: Partial<RobotState> & Pick<RobotState, "id" | "position">
): RobotState {
  return {
    home: overrides.position,
    battery: 100,
    status: "moving",
    path: [],
    priority: 0,
    ...overrides,
  };
}

export function makeWorld(map: WarehouseMap, robots: RobotState[] = [], tasks: Task[] = []): WorldState {
  return {
    tick: 0,
    map,
    robots,
    tasks,
    metrics: { replans: 0, conflictCount: 0, waitMoves: 0, inheritedPriorities: 0, backtracks: 0 },
  };
}

export function findMove(moves: PlannedMove[], robotId: string): PlannedMove {
  const move = moves.find((m) => m.robotId === robotId);
  if (!move) throw new Error(`no planned move for ${robotId}`);
  return move;
}

// Small deterministic PRNG (mulberry32) so randomized tests are reproducible
// across runs without pulling in a dependency.
export function mulberry32(seed: number): () => number {
  let state = seed;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
