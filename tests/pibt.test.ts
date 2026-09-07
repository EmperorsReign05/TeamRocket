import { describe, expect, it } from "vitest";
import { resolvePIBT } from "../src/core/pathfinding/pibt";
import type { Position, RobotState } from "../src/core/types";
import { findMove, makeMap, makeRobot, makeWorld, mulberry32 } from "./helpers";

function eq(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

describe("resolvePIBT", () => {
  it("resolves independent robots on unrelated paths normally", () => {
    const map = makeMap(5, 5);
    const r1 = makeRobot({ id: "R1", position: { x: 0, y: 0 }, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }] });
    const r2 = makeRobot({ id: "R2", position: { x: 4, y: 4 }, path: [{ x: 4, y: 4 }, { x: 3, y: 4 }] });
    const world = makeWorld(map, [r1, r2]);

    const { moves } = resolvePIBT([r1, r2], world);

    expect(findMove(moves, "R1").to).toEqual({ x: 1, y: 0 });
    expect(findMove(moves, "R2").to).toEqual({ x: 3, y: 4 });
  });

  it("only lets the higher-priority robot into a contested destination", () => {
    const map = makeMap(3, 1);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      priority: 2,
    });
    const r2 = makeRobot({
      id: "R2",
      position: { x: 2, y: 0 },
      path: [{ x: 2, y: 0 }, { x: 1, y: 0 }],
      priority: 1,
    });
    const world = makeWorld(map, [r1, r2]);

    const { moves } = resolvePIBT([r1, r2], world);
    const m1 = findMove(moves, "R1");
    const m2 = findMove(moves, "R2");

    expect(eq(m1.to, m2.to)).toBe(false);
    expect(m1.to).toEqual({ x: 1, y: 0 }); // higher priority wins the cell
    expect(m2.to).toEqual({ x: 2, y: 0 }); // loser waits, does not vanish or overlap
  });

  it("never executes a direct two-robot head-on swap", () => {
    const map = makeMap(2, 1);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      priority: 1,
    });
    const r2 = makeRobot({
      id: "R2",
      position: { x: 1, y: 0 },
      path: [{ x: 1, y: 0 }, { x: 0, y: 0 }],
      priority: 1,
    });
    const world = makeWorld(map, [r1, r2]);

    const { moves } = resolvePIBT([r1, r2], world);
    const m1 = findMove(moves, "R1");
    const m2 = findMove(moves, "R2");

    const swapped = eq(m1.to, { x: 1, y: 0 }) && eq(m2.to, { x: 0, y: 0 });
    expect(swapped).toBe(false);
  });

  it("resolves a 3-robot priority-inheritance chain when the tail has free space", () => {
    // R1 -> R2 -> R3 -> free cell. Matches the worked example in the task
    // brief: all three should move in the same tick.
    const map = makeMap(6, 3);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 1, y: 1 },
      path: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
      priority: 3,
    });
    const r2 = makeRobot({
      id: "R2",
      position: { x: 2, y: 1 },
      path: [{ x: 2, y: 1 }, { x: 3, y: 1 }],
      priority: 2,
    });
    const r3 = makeRobot({
      id: "R3",
      position: { x: 3, y: 1 },
      path: [{ x: 3, y: 1 }, { x: 4, y: 1 }],
      priority: 1,
    });
    const world = makeWorld(map, [r1, r2, r3]);

    const { moves, metrics } = resolvePIBT([r1, r2, r3], world);

    expect(findMove(moves, "R1").to).toEqual({ x: 2, y: 1 });
    expect(findMove(moves, "R2").to).toEqual({ x: 3, y: 1 });
    expect(findMove(moves, "R3").to).toEqual({ x: 4, y: 1 });
    expect(metrics.inheritedPriorities).toBeGreaterThan(0);
  });

  it("backtracks to an alternate move when the preferred push fails (spec section 15 example)", () => {
    // R1 wants R2's cell. R2's first choice is R3's cell, but R3 is boxed
    // in and cannot move. R2 must back off and try a different escape,
    // which succeeds — only then can R1 take R2's old cell.
    const map = makeMap(4, 3, [
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 3, y: 1 },
      { x: 1, y: 0 },
    ]);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 1 },
      path: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
      priority: 3,
    });
    const r2 = makeRobot({
      id: "R2",
      position: { x: 1, y: 1 },
      path: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
      priority: 2,
    });
    const r3 = makeRobot({ id: "R3", position: { x: 2, y: 1 }, path: [], priority: 1 });
    const world = makeWorld(map, [r1, r2, r3]);

    const { moves, metrics } = resolvePIBT([r1, r2, r3], world);

    expect(findMove(moves, "R3").to).toEqual({ x: 2, y: 1 }); // boxed in, waits
    expect(findMove(moves, "R2").to).toEqual({ x: 1, y: 2 }); // backtracked here
    expect(findMove(moves, "R1").to).toEqual({ x: 1, y: 1 }); // took R2's vacated cell
    expect(metrics.backtracks).toBeGreaterThan(0);
    expect(metrics.inheritedPriorities).toBeGreaterThanOrEqual(2);
  });

  it("keeps a fully blocked chain safely waiting when there is no escape (spec section 17 example)", () => {
    const map = makeMap(4, 1, [{ x: 3, y: 0 }]);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      priority: 3,
    });
    const r2 = makeRobot({
      id: "R2",
      position: { x: 1, y: 0 },
      path: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
      priority: 2,
    });
    const r3 = makeRobot({
      id: "R3",
      position: { x: 2, y: 0 },
      path: [{ x: 2, y: 0 }, { x: 3, y: 0 }],
      priority: 1,
    });
    const world = makeWorld(map, [r1, r2, r3]);

    const { moves } = resolvePIBT([r1, r2, r3], world);

    for (const move of moves) {
      expect(move.to).toEqual(move.from);
    }
  });

  it("does not starve a robot forever under repeated contention", () => {
    // resolvePIBT itself is stateless/pure — fairness only emerges once
    // something (the simulation engine, in production) accrues priority for
    // a robot that keeps failing to make progress. This test plays that
    // engine role manually: bump the loser's priority after each loss and
    // confirm it eventually wins the contested cell.
    const map = makeMap(3, 1);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      priority: 0,
    });
    let r2 = makeRobot({
      id: "R2",
      position: { x: 2, y: 0 },
      path: [{ x: 2, y: 0 }, { x: 1, y: 0 }],
      priority: 0,
    });

    let r2EventuallyWon = false;
    for (let tick = 0; tick < 10; tick++) {
      const world = makeWorld(map, [r1, r2]);
      const { moves } = resolvePIBT([r1, r2], world);
      const m2 = findMove(moves, "R2");

      if (!eq(m2.to, m2.from)) {
        r2EventuallyWon = true;
        break;
      }
      r2 = { ...r2, priority: r2.priority + 1 };
    }

    expect(r2EventuallyWon).toBe(true);
  });

  it("is deterministic for identical input", () => {
    const map = makeMap(5, 5, [{ x: 2, y: 2 }]);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      priority: 1,
    });
    const r2 = makeRobot({
      id: "R2",
      position: { x: 1, y: 0 },
      path: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
      priority: 1,
    });
    const world = makeWorld(map, [r1, r2]);

    const a = resolvePIBT([r1, r2], world);
    const b = resolvePIBT([r1, r2], world);

    expect(a).toEqual(b);
  });

  it("never plans a move into a blocked cell, even if the given path points at one", () => {
    const map = makeMap(3, 1, [{ x: 1, y: 0 }]);
    const r1 = makeRobot({
      id: "R1",
      position: { x: 0, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }], // stale path into a wall
      priority: 1,
    });
    const world = makeWorld(map, [r1]);

    const { moves } = resolvePIBT([r1], world);

    expect(findMove(moves, "R1").to).toEqual({ x: 0, y: 0 });
  });

  it("never violates safety invariants across many random small worlds (seeded)", () => {
    const rand = mulberry32(42);
    const width = 5;
    const height = 5;
    const directions: Position[] = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (let trial = 0; trial < 200; trial++) {
      const blocked: Position[] = [];
      for (let i = 0; i < 3; i++) {
        blocked.push({ x: Math.floor(rand() * width), y: Math.floor(rand() * height) });
      }
      const blockedSet = new Set(blocked.map((p) => `${p.x},${p.y}`));
      const map = makeMap(width, height, blocked);

      const robotCount = 3 + Math.floor(rand() * 2);
      const used = new Set<string>();
      const robots: RobotState[] = [];

      for (let i = 0; i < robotCount; i++) {
        let pos: Position = { x: 0, y: 0 };
        let key = "";
        let attempts = 0;
        let placed = false;
        do {
          pos = { x: Math.floor(rand() * width), y: Math.floor(rand() * height) };
          key = `${pos.x},${pos.y}`;
          attempts += 1;
          if (!blockedSet.has(key) && !used.has(key)) placed = true;
        } while (!placed && attempts < 50);
        if (!placed) continue;

        used.add(key);
        const dir = directions[Math.floor(rand() * directions.length)];
        const next = { x: pos.x + dir.x, y: pos.y + dir.y };

        robots.push(
          makeRobot({
            id: `R${i}`,
            position: pos,
            path: [pos, next], // may point off-grid or into a wall on purpose
            priority: Math.floor(rand() * 3),
          })
        );
      }

      const world = makeWorld(map, robots);
      const { moves } = resolvePIBT(robots, world);

      expect(moves.length).toBe(robots.length);
      expect(new Set(moves.map((m) => m.robotId)).size).toBe(robots.length);

      for (const move of moves) {
        expect(move.to.x).toBeGreaterThanOrEqual(0);
        expect(move.to.x).toBeLessThan(width);
        expect(move.to.y).toBeGreaterThanOrEqual(0);
        expect(move.to.y).toBeLessThan(height);
        expect(blockedSet.has(`${move.to.x},${move.to.y}`)).toBe(false);
      }

      const destKeys = moves.map((m) => `${m.to.x},${m.to.y}`);
      expect(new Set(destKeys).size).toBe(destKeys.length);

      for (const a of moves) {
        for (const b of moves) {
          if (a.robotId === b.robotId) continue;
          const swapped = eq(a.to, b.from) && eq(b.to, a.from);
          expect(swapped).toBe(false);
        }
      }
    }
  });
});
