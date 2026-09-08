import { describe, expect, it } from "vitest";
import { createWarehouseMap, computeCongestion } from "../src/core/map/warehouse";
import { stepSimulation } from "../src/core/simulation/engine";
import {
  ADDVERB_DYNAMO_100,
  CHARGE_PERCENT_PER_TICK,
  LOW_BATTERY_STREAK_THRESHOLD,
  MIN_BATTERY_TO_BID_PERCENT,
} from "../src/core/simulation/robotModels";
import type { RobotState, Task, WorldState } from "../src/core/types";

function emptyMetrics() {
  return { replans: 0, conflictCount: 0, waitMoves: 0, inheritedPriorities: 0, backtracks: 0 };
}

function worldWith(robots: RobotState[], tasks: Task[] = []): WorldState {
  const map = computeCongestion(createWarehouseMap(), robots);
  return { tick: 0, map, robots, tasks, metrics: emptyMetrics() };
}

function makeIdleRobot(overrides: Partial<RobotState> & Pick<RobotState, "id" | "position">): RobotState {
  return {
    home: overrides.position,
    battery: 50,
    status: "idle",
    model: ADDVERB_DYNAMO_100,
    path: [],
    priority: 0,
    ...overrides,
  };
}

describe("charging: trigger", () => {
  it("sends an idle robot with no work to the nearest charging station once its streak hits the threshold", () => {
    const robot = makeIdleRobot({
      id: "R0",
      position: { x: 2, y: 4 }, // 2 cells from C1 (0,4), far from C2 (19,8)
      lowBatteryStreak: LOW_BATTERY_STREAK_THRESHOLD,
    });
    let world = worldWith([robot]);

    world = stepSimulation(world);

    const r = world.robots[0];
    expect(r.status).toBe("charging");
    // Should be heading toward C1, the nearer station.
    expect(r.path[r.path.length - 1]).toEqual({ x: 0, y: 4 });
  });

  it("does NOT trigger below the threshold", () => {
    const robot = makeIdleRobot({
      id: "R0",
      position: { x: 2, y: 4 },
      lowBatteryStreak: LOW_BATTERY_STREAK_THRESHOLD - 1,
    });
    let world = worldWith([robot]);
    world = stepSimulation(world);
    expect(world.robots[0].status).not.toBe("charging");
  });

  it("triggers immediately once battery drops below the hard floor, even with a zero streak", () => {
    // A robot can cross MIN_BATTERY_TO_BID_PERCENT without ever having
    // accumulated any losing streak at all — e.g. it just finished a task
    // that happened to leave it right below the floor. It must not have to
    // wait around for 3 more auction losses that, per isEligible, it can
    // no longer even be evaluated for once it's below the floor.
    const robot = makeIdleRobot({
      id: "R0",
      position: { x: 2, y: 4 },
      battery: MIN_BATTERY_TO_BID_PERCENT - 1,
      lowBatteryStreak: 0,
    });
    let world = worldWith([robot]);
    world = stepSimulation(world);
    expect(world.robots[0].status).toBe("charging");
  });

  it("does NOT interrupt a robot that's already busy with a task, no matter how high its streak is", () => {
    const home = { x: 2, y: 4 };
    const robot = makeIdleRobot({
      id: "R0",
      position: home,
      home,
      status: "assigned",
      currentTaskId: "T1",
      lowBatteryStreak: LOW_BATTERY_STREAK_THRESHOLD + 5,
    });
    const task: Task = {
      id: "T1",
      pickup: { x: 5, y: 4 },
      dropoff: { x: 8, y: 4 },
      weight: 5,
      createdAt: 0,
      priority: 0,
      status: "assigned",
      assignedRobotId: "R0",
    };
    let world = worldWith([robot], [task]);
    world = stepSimulation(world);
    expect(world.robots[0].status).not.toBe("charging");
  });
});

describe("charging: recharge cycle", () => {
  it("gains battery each tick while parked at a station, then returns to idle at the opportunity-charge target with streak reset", () => {
    const c1 = { x: 0, y: 4 };
    // Opportunity charging, not full: leaves at RECHARGE_TARGET_PERCENT
    // (50), not 100 — see that constant's comment in robotModels.ts for
    // why a shared, scarce charging station benefits from shorter, more
    // frequent top-ups over long full recharges.
    const robot = makeIdleRobot({
      id: "R0",
      position: c1,
      status: "charging",
      battery: 40,
      lowBatteryStreak: LOW_BATTERY_STREAK_THRESHOLD,
    });
    let world = worldWith([robot]);

    // 40 -> 50 at 2%/tick takes 5 ticks.
    for (let i = 0; i < 4; i++) {
      world = stepSimulation(world);
      const r = world.robots[0];
      expect(r.status).toBe("charging");
      expect(r.battery).toBe(40 + CHARGE_PERCENT_PER_TICK * (i + 1));
      expect(r.position).toEqual(c1); // never leaves the station while charging
    }

    world = stepSimulation(world); // 5th tick: hits the 50% target
    const r = world.robots[0];
    expect(r.battery).toBe(50);
    expect(r.status).toBe("idle");
    expect(r.lowBatteryStreak).toBe(0);
  });

  it("travels to the station first, only gaining charge once it actually arrives", () => {
    // Started well below RECHARGE_TARGET_PERCENT so it can't possibly
    // cross the target the instant it arrives — guarantees at least one
    // full tick of visibly gaining charge while still parked.
    const robot = makeIdleRobot({
      id: "R0",
      position: { x: 3, y: 4 },
      status: "charging",
      battery: 30,
    });
    let world = worldWith([robot]);

    let arrivedTick = -1;
    for (let tick = 0; tick < 20 && arrivedTick === -1; tick++) {
      world = stepSimulation(world);
      const r = world.robots[0];
      if (r.position.x === 0 && r.position.y === 4) arrivedTick = tick;
      else expect(r.battery).toBeLessThanOrEqual(30); // still draining/flat while traveling, not gaining
    }

    expect(arrivedTick).toBeGreaterThanOrEqual(0);
    expect(world.robots[0].status).toBe("charging"); // arrived, but not yet at the target
    const afterArrival = stepSimulation(world);
    expect(afterArrival.robots[0].battery).toBeGreaterThan(world.robots[0].battery);
  });
});

describe("charging: queue interaction (regression)", () => {
  // Root cause found via an instrumented 30-robot/6000-tick stress run: a
  // robot finishing a task used to always promote its next queued task
  // immediately, with no battery check — so a robot that won a full
  // MAX_QUEUED_TASKS backlog while healthy would grind through all of it
  // back-to-back, never getting a chance to charge until the entire queue
  // was empty. Robots doing real work below the 20% floor averaged 3.2%
  // battery in that run, with a real minimum of 0%.

  it("diverts to charging instead of promoting the next queued task when battery is below the floor", () => {
    const robot = makeIdleRobot({
      id: "R0",
      position: { x: 2, y: 4 },
      battery: MIN_BATTERY_TO_BID_PERCENT - 1,
      queuedTaskIds: ["Q1", "Q2"],
    });
    let world = worldWith([robot]);

    world = stepSimulation(world);

    const r = world.robots[0];
    expect(r.status).toBe("charging");
    expect(r.currentTaskId).toBeUndefined();
    // The queue survives the detour — nothing is dropped or skipped.
    expect(r.queuedTaskIds).toEqual(["Q1", "Q2"]);
  });

  it("still promotes immediately when battery is healthy (only diverts when it actually needs to)", () => {
    const robot = makeIdleRobot({
      id: "R0",
      position: { x: 2, y: 4 },
      battery: 60,
      queuedTaskIds: ["Q1", "Q2"],
    });
    const task: Task = {
      id: "Q1",
      pickup: { x: 5, y: 4 },
      dropoff: { x: 8, y: 4 },
      weight: 5,
      createdAt: 0,
      priority: 0,
      status: "assigned",
      assignedRobotId: "R0",
    };
    let world = worldWith([robot], [task]);

    world = stepSimulation(world);

    const r = world.robots[0];
    // Promoted and already en route in the same tick — "assigned" the
    // instant it's promoted, "moving" once PIBT resolves its first step
    // toward the pickup, depending on exactly how far the pickup is.
    // Either way it must NOT have gone idle or diverted to charging.
    expect(["assigned", "moving"]).toContain(r.status);
    expect(r.currentTaskId).toBe("Q1");
    expect(r.queuedTaskIds).toEqual(["Q2"]);
  });

  it("resumes the rest of its queue, in order, once it's done charging (nothing gets lost or skipped)", () => {
    const c1 = { x: 0, y: 4 };
    const robot = makeIdleRobot({
      id: "R0",
      position: c1, // already at the station
      battery: MIN_BATTERY_TO_BID_PERCENT - 1,
      queuedTaskIds: ["Q1", "Q2"],
    });
    const tasks: Task[] = [
      { id: "Q1", pickup: c1, dropoff: { x: 3, y: 4 }, weight: 5, createdAt: 0, priority: 0, status: "assigned", assignedRobotId: "R0" },
      { id: "Q2", pickup: { x: 3, y: 4 }, dropoff: c1, weight: 5, createdAt: 0, priority: 0, status: "assigned", assignedRobotId: "R0" },
    ];
    let world = worldWith([robot], tasks);

    world = stepSimulation(world);
    expect(world.robots[0].status).toBe("charging"); // diverted, not promoted, on tick 1

    let promotedToQ1 = false;
    for (let tick = 0; tick < 40 && !promotedToQ1; tick++) {
      world = stepSimulation(world);
      if (world.robots[0].currentTaskId === "Q1") promotedToQ1 = true;
    }

    expect(promotedToQ1).toBe(true);
    expect(world.robots[0].queuedTaskIds).toEqual(["Q2"]); // Q2 still waiting its turn, in order
  });
});
