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
