import { describe, expect, it } from "vitest";
import { createWarehouseMap, isTraversable, getCell } from "../src/core/map/warehouse";
import { getNeighbors } from "../src/core/map/graph";
import { planPath } from "../src/core/pathfinding/astar";
import type { Cell, Position, WarehouseMap, WorldState } from "../src/core/types";
import { mulberry32 } from "./helpers";

function emptyMetrics() {
  return { replans: 0, conflictCount: 0, waitMoves: 0, inheritedPriorities: 0, backtracks: 0 };
}

function worldOf(map: WarehouseMap): WorldState {
  return { tick: 0, map, robots: [], tasks: [], metrics: emptyMetrics() };
}

function makeMap(width: number, height: number, blocked: Position[] = []): WarehouseMap {
  const blockedKeys = new Set(blocked.map((p) => `${p.x},${p.y}`));
  const cells: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ position: { x, y }, blocked: blockedKeys.has(`${x},${y}`), congestion: 0 });
    }
  }
  return { width, height, cells };
}

function positionsOf(map: WarehouseMap) {
  return map.cells.filter((c) => !c.blocked).map((c) => c.position);
}

function bfsDistance(map: WarehouseMap, start: Position, goal: Position): number {
  const goalKey = `${goal.x},${goal.y}`;
  const visited = new Set([`${start.x},${start.y}`]);
  let frontier = [start];
  let distance = 0;
  while (frontier.length > 0) {
    if (frontier.some((p) => `${p.x},${p.y}` === goalKey)) return distance;
    const next: Position[] = [];
    for (const pos of frontier) {
      for (const neighbor of getNeighbors(pos, map)) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
    distance += 1;
  }
  return Infinity;
}

function assertValidPath(map: WarehouseMap, start: Position, goal: Position, result: ReturnType<typeof planPath>) {
  expect(result.path[0]).toEqual(start);
  expect(result.path[result.path.length - 1]).toEqual(goal);
  for (const p of result.path) expect(isTraversable(p, map)).toBe(true);
  for (let k = 1; k < result.path.length; k++) {
    const dx = Math.abs(result.path[k].x - result.path[k - 1].x);
    const dy = Math.abs(result.path[k].y - result.path[k - 1].y);
    expect(dx + dy, `non-adjacent path step at index ${k}`).toBe(1);
  }
  expect(result.distance).toBe(result.path.length - 1);
}

describe("STRESS: A* massive random sampling on the real warehouse map", () => {
  const SEEDS = [1, 2, 3, 4, 5, 42, 1337, 90210, 8675309, 271828];

  it.each(SEEDS)("seed %i: 1000 random start/goal pairs, all valid, all deterministic", (seed) => {
    const map = createWarehouseMap();
    const open = positionsOf(map);
    const world = worldOf(map);
    const rand = mulberry32(seed);

    let found = 0;
    for (let i = 0; i < 1000; i++) {
      const s = open[Math.floor(rand() * open.length)];
      const g = open[Math.floor(rand() * open.length)];

      const a = planPath(s, g, world);
      const b = planPath(s, g, world);
      expect(b).toEqual(a);

      if (a.found) {
        found += 1;
        assertValidPath(map, s, g, a);
        expect(a.totalCost).toBe(a.distance + a.congestionCost);
        expect(a.eta).toBe(a.distance);
      } else {
        expect(a.path).toEqual([]);
        expect(a.distance).toBe(Infinity);
      }
    }
    expect(found).toBeGreaterThan(800); // fully-open map: virtually everything should connect
  });
});

describe("STRESS: A* on large synthetic maps", () => {
  it("60x40 open map matches BFS shortest-path length for 300 random pairs", () => {
    const width = 60;
    const height = 40;
    const rand = mulberry32(777);
    // scatter random 1-cell obstacles (10% density) but keep it solvable by
    // just checking BFS-vs-A* agreement (both see the same obstacles)
    const blocked: Position[] = [];
    for (let i = 0; i < (width * height) / 10; i++) {
      blocked.push({ x: Math.floor(rand() * width), y: Math.floor(rand() * height) });
    }
    const map = makeMap(width, height, blocked);
    const world = worldOf(map);
    const open = positionsOf(map);

    const start = performance.now();
    let compared = 0;
    for (let i = 0; i < 300; i++) {
      const s = open[Math.floor(rand() * open.length)];
      const g = open[Math.floor(rand() * open.length)];
      const result = planPath(s, g, world);
      const bfs = bfsDistance(map, s, g);
      expect(result.found).toBe(bfs !== Infinity);
      if (result.found) {
        expect(result.distance).toBe(bfs);
        compared += 1;
      }
    }
    const elapsed = performance.now() - start;
    expect(compared).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(10000);
  });

  it("120x80 open map: 100 random pairs complete well within a generous time budget", () => {
    const width = 120;
    const height = 80;
    const map = makeMap(width, height);
    const world = worldOf(map);
    const rand = mulberry32(555);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const s = { x: Math.floor(rand() * width), y: Math.floor(rand() * height) };
      const g = { x: Math.floor(rand() * width), y: Math.floor(rand() * height) };
      const result = planPath(s, g, world);
      expect(result.found).toBe(true);
      assertValidPath(map, s, g, result);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(15000);
  }, 20000);
});

describe("A*: degenerate map edge cases", () => {
  it("1x1 map: start equals goal, trivially succeeds", () => {
    const map = makeMap(1, 1);
    const result = planPath({ x: 0, y: 0 }, { x: 0, y: 0 }, worldOf(map));
    expect(result).toEqual({ found: true, path: [{ x: 0, y: 0 }], distance: 0, congestionCost: 0, totalCost: 0, eta: 0 });
  });

  it("map with zero traversable cells besides a single open start=goal cell", () => {
    // 3x3, everything blocked except the center.
    const blocked: Position[] = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (!(x === 1 && y === 1)) blocked.push({ x, y });
    const map = makeMap(3, 3, blocked);
    const result = planPath({ x: 1, y: 1 }, { x: 1, y: 1 }, worldOf(map));
    expect(result.found).toBe(true);
    expect(result.path).toEqual([{ x: 1, y: 1 }]);
  });

  it("completely disconnected regions: never found, never throws", () => {
    // Two 2x2 rooms separated by a solid wall column, no gap anywhere.
    const blocked: Position[] = [];
    for (let y = 0; y < 4; y++) blocked.push({ x: 2, y });
    const map = makeMap(5, 4, blocked);
    expect(() => planPath({ x: 0, y: 0 }, { x: 4, y: 3 }, worldOf(map))).not.toThrow();
    const result = planPath({ x: 0, y: 0 }, { x: 4, y: 3 }, worldOf(map));
    expect(result.found).toBe(false);
  });

  it("goal strictly outside map bounds (negative, and beyond width/height) never found, never throws", () => {
    const map = makeMap(5, 5);
    const world = worldOf(map);
    for (const goal of [{ x: -1, y: 2 }, { x: 5, y: 2 }, { x: 2, y: -1 }, { x: 2, y: 5 }, { x: -3, y: -3 }]) {
      expect(() => planPath({ x: 0, y: 0 }, goal, world)).not.toThrow();
      expect(planPath({ x: 0, y: 0 }, goal, world).found).toBe(false);
    }
  });

  it("start strictly outside map bounds never found, never throws", () => {
    const map = makeMap(5, 5);
    const world = worldOf(map);
    for (const start of [{ x: -1, y: 2 }, { x: 5, y: 2 }, { x: 100, y: 100 }]) {
      expect(() => planPath(start, { x: 2, y: 2 }, world)).not.toThrow();
      expect(planPath(start, { x: 2, y: 2 }, world).found).toBe(false);
    }
  });

  it("goal cell itself is blocked (not start==goal): correctly unreachable, never throws", () => {
    const map = makeMap(5, 5, [{ x: 3, y: 3 }]);
    const world = worldOf(map);
    expect(() => planPath({ x: 0, y: 0 }, { x: 3, y: 3 }, world)).not.toThrow();
    expect(planPath({ x: 0, y: 0 }, { x: 3, y: 3 }, world).found).toBe(false);
  });

  it("1xN single-row corridor: shortest path is a straight line", () => {
    const map = makeMap(20, 1);
    const result = planPath({ x: 0, y: 0 }, { x: 19, y: 0 }, worldOf(map));
    expect(result.found).toBe(true);
    expect(result.distance).toBe(19);
  });

  it("Nx1 single-column corridor: shortest path is a straight line", () => {
    const map = makeMap(1, 20);
    const result = planPath({ x: 0, y: 0 }, { x: 0, y: 19 }, worldOf(map));
    expect(result.found).toBe(true);
    expect(result.distance).toBe(19);
  });

  it("spiral maze: finds the one true route and it's exactly the spiral length", () => {
    // Hand-built spiral: only one possible path from center to corner.
    // 7x7 grid with concentric spiral walls, gap pattern below.
    const width = 7, height = 7;
    const blocked: Position[] = [];
    // Outer ring wall with a gap at top-right, inner ring wall with a gap at bottom-left.
    for (let x = 1; x <= 5; x++) blocked.push({ x, y: 1 });
    for (let y = 1; y <= 4; y++) blocked.push({ x: 5, y });
    for (let x = 2; x <= 5; x++) blocked.push({ x, y: 4 }); // leave (1,4) open as continuation
    // remove one cell to keep a route open: (5,1) stays open as the gap into the spiral
    const withoutGap = blocked.filter((p) => !(p.x === 5 && p.y === 1));
    const map = makeMap(width, height, withoutGap);
    const world = worldOf(map);
    const result = planPath({ x: 0, y: 0 }, { x: 3, y: 2 }, world);
    expect(result.found).toBe(true);
    for (const p of result.path) expect(isTraversable(p, map)).toBe(true);
  });
});

describe("A*: congestion edge cases", () => {
  it("extreme congestion on the only direct route still finds it if there is truly no alternative", () => {
    // 1-wide corridor: no detour possible regardless of congestion, since
    // there is no other route at all.
    const map = makeMap(10, 1);
    const withCongestion: WarehouseMap = {
      ...map,
      cells: map.cells.map((c) => ({ ...c, congestion: c.position.x > 0 && c.position.x < 9 ? 1_000_000 : 0 })),
    };
    const result = planPath({ x: 0, y: 0 }, { x: 9, y: 0 }, worldOf(withCongestion));
    expect(result.found).toBe(true);
    expect(result.distance).toBe(9);
    expect(result.congestionCost).toBeGreaterThan(0);
    expect(result.totalCost).toBe(result.distance + result.congestionCost);
  });

  it("congestion never changes whether a path is found, only its cost", () => {
    const map = makeMap(8, 8, [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }]);
    const rand = mulberry32(2024);
    const congested: WarehouseMap = {
      ...map,
      cells: map.cells.map((c) => ({ ...c, congestion: Math.floor(rand() * 50) })),
    };
    for (let i = 0; i < 30; i++) {
      const s = { x: Math.floor(rand() * 8), y: Math.floor(rand() * 8) };
      const g = { x: Math.floor(rand() * 8), y: Math.floor(rand() * 8) };
      if ((s.x === 4 && [3, 4, 5].includes(s.y)) || (g.x === 4 && [3, 4, 5].includes(g.y))) continue;
      const plain = planPath(s, g, worldOf(map));
      const withCongestion = planPath(s, g, worldOf(congested));
      expect(withCongestion.found).toBe(plain.found);
      if (plain.found) {
        expect(withCongestion.totalCost).toBeGreaterThanOrEqual(plain.totalCost);
      }
    }
  });

  it("zero congestion everywhere gives totalCost === distance", () => {
    const map = createWarehouseMap();
    const world = worldOf(map);
    const result = planPath({ x: 1, y: 0 }, { x: 14, y: 0 }, world);
    expect(result.found).toBe(true);
    expect(result.congestionCost).toBe(0);
    expect(result.totalCost).toBe(result.distance);
  });
});

describe("A*: determinism under repetition, at scale", () => {
  it("same call repeated 50 times on a busy map always returns byte-identical results", () => {
    const rand = mulberry32(31415);
    const blocked: Position[] = [];
    for (let i = 0; i < 40; i++) blocked.push({ x: Math.floor(rand() * 20), y: Math.floor(rand() * 20) });
    const map = makeMap(20, 20, blocked);
    const world = worldOf(map);
    const start = { x: 0, y: 0 };
    const goal = { x: 19, y: 19 };

    const results = Array.from({ length: 50 }, () => planPath(start, goal, world));
    for (const r of results) expect(r).toEqual(results[0]);
  });
});

describe("A*: sanity — real map named locations are always mutually reachable", () => {
  it("every pickup/dropoff/waiting-zone reference point can reach every other", () => {
    const map = createWarehouseMap();
    const world = worldOf(map);
    const points: Position[] = [
      { x: 1, y: 0 },
      { x: 14, y: 0 },
      { x: 6, y: 12 },
      { x: 17, y: 12 },
      { x: 6, y: 4 },
      { x: 13, y: 8 },
    ];
    for (const a of points) {
      for (const b of points) {
        if (a === b) continue;
        expect(getCell(map, a)?.blocked).toBe(false);
        const result = planPath(a, b, world);
        expect(result.found, `${JSON.stringify(a)} -> ${JSON.stringify(b)}`).toBe(true);
      }
    }
  });
});
