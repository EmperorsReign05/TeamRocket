import { describe, expect, it } from "vitest";
import { createWarehouseMap, computeCongestion, isTraversable } from "../src/core/map/warehouse";
import { createInitialWorld } from "../src/core/simulation/state";
import { stepSimulation } from "../src/core/simulation/engine";
import { ROBOT_MODELS } from "../src/core/simulation/robotModels";
import type { RobotState, Task, WorldState } from "../src/core/types";
import { mulberry32 } from "./helpers";

function checkWorldInvariants(world: WorldState, label: string) {
  const seen = new Set<string>();
  for (const r of world.robots) {
    const key = `${r.position.x},${r.position.y}`;
    expect(seen.has(key), `${label}: duplicate occupied cell ${key}`).toBe(false);
    seen.add(key);
    expect(isTraversable(r.position, world.map), `${label}: robot ${r.id} on blocked cell`).toBe(true);
    expect(r.battery, `${label}: robot ${r.id} battery out of [0,100]`).toBeGreaterThanOrEqual(0);
    expect(r.battery, `${label}: robot ${r.id} battery out of [0,100]`).toBeLessThanOrEqual(100);
  }
  // metrics only ever grow (nothing in the engine should ever decrement them)
  expect(world.metrics.replans).toBeGreaterThanOrEqual(0);
  expect(world.metrics.conflictCount).toBeGreaterThanOrEqual(0);
  expect(world.metrics.waitMoves).toBeGreaterThanOrEqual(0);
  expect(world.metrics.inheritedPriorities).toBeGreaterThanOrEqual(0);
  expect(world.metrics.backtracks).toBeGreaterThanOrEqual(0);
}

describe("STRESS: full engine pipeline (createInitialWorld + stepSimulation)", () => {
  it("runs 5000 ticks on the seeded world without ever violating an invariant, and completes real tasks", () => {
    let world = createInitialWorld();
    let prevMetrics = world.metrics;

    const start = performance.now();
    for (let tick = 0; tick < 5000; tick++) {
      expect(() => stepSimulation(world)).not.toThrow();
      world = stepSimulation(world);
      checkWorldInvariants(world, `tick ${tick}`);

      // metrics are monotonically non-decreasing cumulative counters
      expect(world.metrics.replans).toBeGreaterThanOrEqual(prevMetrics.replans);
      expect(world.metrics.conflictCount).toBeGreaterThanOrEqual(prevMetrics.conflictCount);
      prevMetrics = world.metrics;

      expect(world.tick).toBe(tick + 1);
    }
    const elapsed = performance.now() - start;

    const completed = world.tasks.filter((t) => t.status === "completed").length;
    expect(completed).toBeGreaterThan(0); // T-102/T-103 should complete well within 5000 ticks
    expect(elapsed).toBeLessThan(20000);
  }, 30000);

  it("survives a robot failing mid-route: no crash, no collisions, everyone else keeps working", () => {
    let world = createInitialWorld();

    for (let tick = 0; tick < 20; tick++) {
      world = stepSimulation(world);
    }

    // Fail whichever robot currently has an active task, mid-route.
    const target = world.robots.find((r) => r.currentTaskId) ?? world.robots[0];
    world = {
      ...world,
      robots: world.robots.map((r) => (r.id === target.id ? { ...r, status: "failed" } : r)),
    };

    for (let tick = 0; tick < 2000; tick++) {
      expect(() => stepSimulation(world)).not.toThrow();
      world = stepSimulation(world);
      checkWorldInvariants(world, `post-failure tick ${tick}`);

      const failedRobot = world.robots.find((r) => r.id === target.id)!;
      expect(failedRobot.status).toBe("failed");
      expect(failedRobot.position).toEqual(target.position); // never moves again
    }
  }, 20000);

  it("failing every robot simultaneously: the world freezes safely, forever, no throw", () => {
    let world = createInitialWorld();
    world = { ...world, robots: world.robots.map((r) => ({ ...r, status: "failed" as const })) };
    const positionsBefore = world.robots.map((r) => ({ ...r.position }));

    for (let tick = 0; tick < 500; tick++) {
      expect(() => stepSimulation(world)).not.toThrow();
      world = stepSimulation(world);
    }

    world.robots.forEach((r, i) => expect(r.position).toEqual(positionsBefore[i]));
  });
});

describe("STRESS: engine at higher robot density than the seeded scenario", () => {
  function buildBusyWorld(robotCount: number, seed: number): WorldState {
    const rand = mulberry32(seed);
    const baseMap = createWarehouseMap();
    const open = baseMap.cells.filter((c) => !c.blocked).map((c) => c.position);

    const used = new Set<string>();
    const robots: RobotState[] = [];
    for (let i = 0; i < robotCount; i++) {
      let pos = open[0];
      let key = "";
      let placed = false;
      for (let attempts = 0; attempts < 50 && !placed; attempts++) {
        pos = open[Math.floor(rand() * open.length)];
        key = `${pos.x},${pos.y}`;
        if (!used.has(key)) placed = true;
      }
      if (!placed) continue;
      used.add(key);
      robots.push({
        id: `H${i}`,
        position: pos,
        home: pos,
        battery: 100,
        status: "idle",
        model: ROBOT_MODELS[i % ROBOT_MODELS.length],
        path: [],
        priority: 0,
      });
    }

    // Give roughly half of them an active task so the engine has real work
    // to route, not just idle robots sitting at home.
    const tasks: Task[] = [];
    robots.forEach((r, i) => {
      if (i % 2 !== 0) return;
      const pickup = open[Math.floor(rand() * open.length)];
      const dropoff = open[Math.floor(rand() * open.length)];
      const taskId = `HT-${i}`;
      tasks.push({
        id: taskId,
        pickup,
        dropoff,
        weight: 20,
        createdAt: 0,
        priority: 1,
        status: "assigned",
        assignedRobotId: r.id,
      });
      robots[i] = { ...r, currentTaskId: taskId, status: "assigned" };
    });

    return {
      tick: 0,
      map: computeCongestion(baseMap, robots),
      robots,
      tasks,
      metrics: { replans: 0, conflictCount: 0, waitMoves: 0, inheritedPriorities: 0, backtracks: 0 },
    };
  }

  it("40 robots (roughly a quarter of the map's open cells), 1000 ticks: fully safe, real throughput", () => {
    let world = buildBusyWorld(40, 123);
    const startBattery = new Map(world.robots.map((r) => [r.id, r.battery]));

    for (let tick = 0; tick < 1000; tick++) {
      expect(() => stepSimulation(world)).not.toThrow();
      world = stepSimulation(world);
      checkWorldInvariants(world, `tick ${tick}`);
    }

    // "Did any robot end up somewhere other than its start cell" is NOT a
    // reliable proxy for "real work happened" — a robot that finishes its
    // one task and dutifully returns home (or an idle robot that gets
    // nudged out of the way by PIBT and self-corrects back) can legitimately
    // land back on its exact starting cell despite having moved plenty.
    // Cumulative battery drain can't be faked by standing still, so it's a
    // much more honest signal of throughput.
    const totalDrain = world.robots.reduce((sum, r) => sum + ((startBattery.get(r.id) ?? 100) - r.battery), 0);
    expect(totalDrain).toBeGreaterThan(0);
  }, 20000);
});

describe("engine: task queue promotion", () => {
  it("pulls the next queued task into currentTaskId when the active one completes", () => {
    let world = createInitialWorld();
    // Give AMR-01 (idle, no task) a currentTaskId pointing at a trivial
    // one-cell task plus a queued follow-up, then run it to completion.
    const home = world.robots[0].home;
    const firstTaskId = "QT-1";
    const secondTaskId = "QT-2";
    world = {
      ...world,
      robots: world.robots.map((r, i) =>
        i === 0
          ? { ...r, currentTaskId: firstTaskId, queuedTaskIds: [secondTaskId], status: "assigned" }
          : r
      ),
      tasks: [
        ...world.tasks,
        { id: firstTaskId, pickup: home, dropoff: { x: home.x + 1, y: home.y }, weight: 5, createdAt: 0, priority: 0, status: "assigned", assignedRobotId: world.robots[0].id },
        { id: secondTaskId, pickup: { x: home.x + 1, y: home.y }, dropoff: home, weight: 5, createdAt: 0, priority: 0, status: "assigned", assignedRobotId: world.robots[0].id },
      ],
    };

    let sawPromotion = false;
    for (let tick = 0; tick < 30; tick++) {
      world = stepSimulation(world);
      const r = world.robots.find((x) => x.id === "AMR-01")!;
      if (r.currentTaskId === secondTaskId) sawPromotion = true;
    }

    expect(sawPromotion).toBe(true);
    const r = world.robots.find((x) => x.id === "AMR-01")!;
    expect(r.queuedTaskIds ?? []).toEqual([]);
  });

  it("goes idle (not stuck) when the queue is empty on completion", () => {
    let world = createInitialWorld();
    const home = world.robots[0].home;
    const taskId = "QT-solo";
    world = {
      ...world,
      robots: world.robots.map((r, i) =>
        i === 0 ? { ...r, currentTaskId: taskId, queuedTaskIds: [], status: "assigned" } : r
      ),
      tasks: [
        ...world.tasks,
        { id: taskId, pickup: home, dropoff: { x: home.x + 1, y: home.y }, weight: 5, createdAt: 0, priority: 0, status: "assigned", assignedRobotId: world.robots[0].id },
      ],
    };

    for (let tick = 0; tick < 20; tick++) {
      world = stepSimulation(world);
    }

    const r = world.robots.find((x) => x.id === "AMR-01")!;
    expect(r.currentTaskId).toBeUndefined();
    expect(r.status).toBe("idle");
  });
});
