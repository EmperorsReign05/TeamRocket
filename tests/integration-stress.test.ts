import { describe, expect, it } from "vitest";
import { createWarehouseMap, computeCongestion, isTraversable } from "../src/core/map/warehouse";
import { runDispatchTick } from "../src/core/simulation/dispatch";
import { ROBOT_MODELS } from "../src/core/simulation/robotModels";
import type { Position, RobotState, Task, WorldState } from "../src/core/types";
import { mulberry32 } from "./helpers";

// Whole-backend integration stress: bidding (auction), congestion-aware A*,
// PIBT, and the tick engine all running together continuously, the way a
// real dispatcher would drive them — not any one module in isolation. This
// is deliberately heavier and slower than the per-module stress suites.

function emptyMetrics() {
  return { replans: 0, conflictCount: 0, waitMoves: 0, inheritedPriorities: 0, backtracks: 0 };
}

function checkTickInvariants(world: WorldState, label: string) {
  const seen = new Set<string>();
  for (const r of world.robots) {
    const key = `${r.position.x},${r.position.y}`;
    expect(seen.has(key), `${label}: duplicate occupied cell ${key}`).toBe(false);
    seen.add(key);
    expect(isTraversable(r.position, world.map), `${label}: robot ${r.id} on blocked cell`).toBe(true);
    expect(r.battery, `${label}: robot ${r.id} battery out of range`).toBeGreaterThanOrEqual(0);
    expect(r.battery, `${label}: robot ${r.id} battery out of range`).toBeLessThanOrEqual(100);
    expect(r.queuedTaskIds?.length ?? 0, `${label}: robot ${r.id} queue over cap`).toBeLessThanOrEqual(4);
  }
}

// Every assigned/in_progress task must be claimed by exactly one robot,
// whether as its active task or somewhere in its queue — this is the
// specific failure mode a bidding-while-busy model risks (over-commitment
// across a batch of auction rounds) if the bookkeeping is ever wrong.
function checkNoDoubleBooking(world: WorldState, label: string) {
  const owners = new Map<string, string[]>();
  for (const r of world.robots) {
    if (r.currentTaskId) owners.set(r.currentTaskId, [...(owners.get(r.currentTaskId) ?? []), r.id]);
    for (const qid of r.queuedTaskIds ?? []) {
      owners.set(qid, [...(owners.get(qid) ?? []), r.id]);
    }
  }
  for (const task of world.tasks) {
    if (task.status === "assigned" || task.status === "in_progress") {
      const ownerList = owners.get(task.id) ?? [];
      expect(ownerList.length, `${label}: task ${task.id} owned by [${ownerList.join(",")}]`).toBe(1);
    }
  }
}

function randomTask(id: string, tick: number, rand: () => number, openCells: Position[], impossible: boolean): Task {
  const pickup = openCells[Math.floor(rand() * openCells.length)];
  let dropoff = openCells[Math.floor(rand() * openCells.length)];
  for (let guard = 0; guard < 10 && dropoff.x === pickup.x && dropoff.y === pickup.y; guard++) {
    dropoff = openCells[Math.floor(rand() * openCells.length)];
  }
  const weight = impossible ? 500 : Math.floor(rand() * 90) + 5; // both real models cap at <=100kg
  const deadline = rand() < 0.3 ? tick + Math.floor(rand() * 200) + 10 : undefined;

  return {
    id,
    pickup,
    dropoff,
    weight,
    createdAt: tick,
    priority: Math.floor(rand() * 5),
    status: "pending",
    deadline,
  };
}

function buildFleet(count: number, rand: () => number, open: Position[]): RobotState[] {
  const used = new Set<string>();
  const robots: RobotState[] = [];
  for (let i = 0; i < count; i++) {
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
      id: `F${i}`,
      position: pos,
      home: pos,
      battery: 100,
      status: "idle",
      model: ROBOT_MODELS[i % ROBOT_MODELS.length],
      path: [],
      priority: 0,
    });
  }
  return robots;
}

describe("STRESS: the whole backend — bidding + A* + PIBT + engine, together, continuously", () => {
  it("runs a 30-robot fleet under continuous task generation for 6000 ticks without a single invariant violation", () => {
    const rand = mulberry32(999);
    const baseMap = createWarehouseMap();
    const open = baseMap.cells.filter((c) => !c.blocked).map((c) => c.position);
    const robots = buildFleet(30, rand, open);

    let world: WorldState = {
      tick: 0,
      map: computeCongestion(baseMap, robots),
      robots,
      tasks: [],
      metrics: emptyMetrics(),
    };

    const TICKS = 6000;
    let taskCounter = 0;
    let impossibleCount = 0;
    let failuresInjected = 0;
    let chargingTrips = 0;
    const start = performance.now();

    for (let tick = 0; tick < TICKS; tick++) {
      const chargingBefore = new Set(world.robots.filter((r) => r.status === "charging").map((r) => r.id));

      if (tick % 4 === 0) {
        const numNew = 1 + Math.floor(rand() * 2);
        const newTasks: Task[] = [];
        for (let k = 0; k < numNew; k++) {
          const impossible = rand() < 0.05;
          if (impossible) impossibleCount++;
          newTasks.push(randomTask(`GEN-${taskCounter++}`, tick, rand, open, impossible));
        }
        world = { ...world, tasks: [...world.tasks, ...newTasks] };
      }

      // Rare, permanent robot breakdowns — the fleet must keep functioning
      // at reduced capacity, never crash, never leave a dangling
      // reference to the robot that just died.
      if (tick > 0 && tick % 1500 === 0) {
        const alive = world.robots.filter((r) => r.status !== "failed");
        if (alive.length > 8) {
          const victim = alive[Math.floor(rand() * alive.length)];
          failuresInjected += 1;
          world = {
            ...world,
            robots: world.robots.map((r) => (r.id === victim.id ? { ...r, status: "failed" as const } : r)),
          };
        }
      }

      expect(() => runDispatchTick(world), `tick ${tick}`).not.toThrow();
      world = runDispatchTick(world);

      for (const r of world.robots) {
        if (r.status === "charging" && !chargingBefore.has(r.id)) chargingTrips += 1;
      }

      checkTickInvariants(world, `tick ${tick}`);
      checkNoDoubleBooking(world, `tick ${tick}`);
    }

    const elapsed = performance.now() - start;
    const completed = world.tasks.filter((t) => t.status === "completed").length;
    const pending = world.tasks.filter((t) => t.status === "pending").length;
    const failedRobots = world.robots.filter((r) => r.status === "failed").length;
    const avgBattery = world.robots.reduce((sum, r) => sum + r.battery, 0) / world.robots.length;

    console.log(
      `integration stress: generated=${taskCounter} completed=${completed} pending=${pending} ` +
        `impossible=${impossibleCount} failuresInjected=${failuresInjected} failedRobots=${failedRobots} ` +
        `avgBattery=${avgBattery.toFixed(1)}% chargingTrips=${chargingTrips} elapsed=${elapsed.toFixed(0)}ms`
    );
    expect(chargingTrips).toBeGreaterThan(0); // the whole point of this feature must actually fire under sustained load
    // Battery still only ever decreases from movement (see engine.ts's
    // drain) — the difference now is that a robot which keeps losing bids
    // to low charge gets pulled out and sent to recharge instead of idling
    // forever, so the fleet's average should settle somewhere below 100%
    // rather than monotonically collapsing toward empty.
    expect(avgBattery).toBeLessThan(100);
    expect(avgBattery).toBeGreaterThan(0);

    expect(completed).toBeGreaterThan(0);
    expect(failedRobots).toBe(failuresInjected);
    // Overweight tasks must never have been picked up by anyone.
    for (const task of world.tasks) {
      if (task.weight > 100 && (task.status === "assigned" || task.status === "in_progress" || task.status === "completed")) {
        throw new Error(`impossible task ${task.id} (weight ${task.weight}) was somehow assigned/completed`);
      }
    }
    // This is a correctness test, not a performance benchmark — a tight
    // wall-clock budget here is just machine-dependent flakiness waiting
    // to happen (confirmed during development: identical output, ~2.3x
    // timing swing between runs with zero code changes on this same
    // machine, load average included). The ceiling here is only a "didn't
    // hang / didn't regress by an order of magnitude" sanity check.
    expect(elapsed).toBeLessThan(240000);
  }, 300000);

  it("survives an avalanche of 200 tasks dropped on a 15-robot fleet all at once", () => {
    const rand = mulberry32(31337);
    const baseMap = createWarehouseMap();
    const open = baseMap.cells.filter((c) => !c.blocked).map((c) => c.position);
    const robots = buildFleet(15, rand, open);

    const tasks: Task[] = [];
    for (let i = 0; i < 200; i++) {
      tasks.push(randomTask(`AV-${i}`, 0, rand, open, rand() < 0.1));
    }

    let world: WorldState = {
      tick: 0,
      map: computeCongestion(baseMap, robots),
      robots,
      tasks,
      metrics: emptyMetrics(),
    };

    for (let tick = 0; tick < 2000; tick++) {
      expect(() => runDispatchTick(world), `tick ${tick}`).not.toThrow();
      world = runDispatchTick(world);
      checkTickInvariants(world, `tick ${tick}`);
      checkNoDoubleBooking(world, `tick ${tick}`);
    }

    const completed = world.tasks.filter((t) => t.status === "completed").length;
    // 15 robots x up to 5 slots each = 75 concurrent commitments against
    // 200 tasks — the backlog is real, but completion should still happen.
    expect(completed).toBeGreaterThan(20);
  }, 120000);

  it("degrades gracefully as the fleet is decimated down to a single robot", () => {
    const rand = mulberry32(2468);
    const baseMap = createWarehouseMap();
    const open = baseMap.cells.filter((c) => !c.blocked).map((c) => c.position);
    const robots = buildFleet(20, rand, open);

    let world: WorldState = {
      tick: 0,
      map: computeCongestion(baseMap, robots),
      robots,
      tasks: [],
      metrics: emptyMetrics(),
    };

    let taskCounter = 0;

    for (let tick = 0; tick < 3000; tick++) {
      if (tick % 6 === 0) {
        world = { ...world, tasks: [...world.tasks, randomTask(`D-${taskCounter++}`, tick, rand, open, false)] };
      }

      // Fail one robot every 150 ticks until only one remains.
      if (tick > 0 && tick % 150 === 0) {
        const alive = world.robots.filter((r) => r.status !== "failed");
        if (alive.length > 1) {
          const victim = alive[Math.floor(rand() * alive.length)];
          world = {
            ...world,
            robots: world.robots.map((r) => (r.id === victim.id ? { ...r, status: "failed" as const } : r)),
          };
        }
      }

      expect(() => runDispatchTick(world), `tick ${tick}`).not.toThrow();
      world = runDispatchTick(world);
      checkTickInvariants(world, `tick ${tick}`);
      checkNoDoubleBooking(world, `tick ${tick}`);
    }

    const aliveCount = world.robots.filter((r) => r.status !== "failed").length;
    expect(aliveCount).toBe(1);
    // The lone survivor should still be sitting on a valid, traversable cell.
    const survivor = world.robots.find((r) => r.status !== "failed")!;
    expect(isTraversable(survivor.position, world.map)).toBe(true);
  }, 120000);
});
