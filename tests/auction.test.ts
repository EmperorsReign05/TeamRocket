import { describe, expect, it } from "vitest";
import { calculateBid } from "../src/core/auction/cost";
import { assignTask, getAllBids, getBiddingRobots, updateLowBatteryStreaks } from "../src/core/auction/assign";
import type { RobotState, Task, WorldState } from "../src/core/types";
import { ADDVERB_DYNAMO_100, SCOUT_AGILE_2 } from "../src/core/simulation/robotModels";
import { makeMap, makeRobot, makeWorld } from "./helpers";

function makeTask(overrides: Partial<Task> & Pick<Task, "id" | "pickup" | "dropoff">): Task {
  return {
    weight: 10,
    createdAt: 0,
    priority: 0,
    status: "pending",
    ...overrides,
  };
}

describe("calculateBid", () => {
  it("is infeasible when the pickup or dropoff is unreachable", () => {
    const map = makeMap(5, 1, [{ x: 2, y: 0 }]); // wall splits the corridor
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 } });
    const task = makeTask({ id: "T0", pickup: { x: 4, y: 0 }, dropoff: { x: 0, y: 0 } });
    const world = makeWorld(map, [robot], [task]);

    const bid = calculateBid(robot, task, world);
    expect(bid.feasible).toBe(false);
    expect(bid.totalCost).toBe(Infinity);
  });

  it("is infeasible when the route would drop the robot below the battery safety reserve", () => {
    const map = makeMap(50, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 }, battery: 5 });
    const task = makeTask({ id: "T0", pickup: { x: 40, y: 0 }, dropoff: { x: 49, y: 0 } });
    const world = makeWorld(map, [robot], [task]);

    const bid = calculateBid(robot, task, world);
    expect(bid.feasible).toBe(false);
    expect(bid.batteryCost).toBe(Infinity);
  });

  it("is feasible with a real totalCost for a reachable, well-charged robot", () => {
    const map = makeMap(10, 10);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 }, battery: 100 });
    const task = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 3, y: 3 } });
    const world = makeWorld(map, [robot], [task]);

    const bid = calculateBid(robot, task, world);
    expect(bid.feasible).toBe(true);
    expect(bid.totalCost).toBeGreaterThan(0);
    expect(bid.totalCost).toBeLessThan(Infinity);
    expect(bid.eta).toBe(bid.travelCost); // no congestion, no existing workload
  });

  it("gives a closer robot a lower travel cost than a farther one for the same task", () => {
    const map = makeMap(20, 1);
    const near = makeRobot({ id: "NEAR", position: { x: 8, y: 0 } });
    const far = makeRobot({ id: "FAR", position: { x: 0, y: 0 } });
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 0 }, dropoff: { x: 15, y: 0 } });
    const world = makeWorld(map, [near, far], [task]);

    const nearBid = calculateBid(near, task, world);
    const farBid = calculateBid(far, task, world);
    expect(nearBid.totalCost).toBeLessThan(farBid.totalCost);
  });

  it("penalizes a busy robot's ETA by its remaining route length, not just the new task's travel", () => {
    const map = makeMap(20, 1);
    const idle = makeRobot({ id: "IDLE", position: { x: 5, y: 0 } });
    const busy = makeRobot({
      id: "BUSY",
      position: { x: 5, y: 0 },
      currentTaskId: "existing",
      path: Array.from({ length: 10 }, (_, i) => ({ x: 5 + i, y: 0 })), // 9 remaining ticks
    });
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 0 }, dropoff: { x: 15, y: 0 } });
    const world = makeWorld(map, [idle, busy], [task]);

    const idleBid = calculateBid(idle, task, world);
    const busyBid = calculateBid(busy, task, world);
    expect(busyBid.eta).toBe(idleBid.eta + 9);
  });

  it("prefers a robot that stays better-charged after the task (lower battery cost)", () => {
    const map = makeMap(20, 1);
    const full = makeRobot({ id: "FULL", position: { x: 0, y: 0 }, battery: 100 });
    const low = makeRobot({ id: "LOW", position: { x: 0, y: 0 }, battery: 30 });
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 10, y: 0 } });
    const world = makeWorld(map, [full, low], [task]);

    const fullBid = calculateBid(full, task, world);
    const lowBid = calculateBid(low, task, world);
    expect(fullBid.batteryCost).toBeLessThan(lowBid.batteryCost);
  });

  it("is infeasible when the task is heavier than the robot's payload capacity", () => {
    const map = makeMap(10, 1);
    const scout = makeRobot({ id: "SCOUT", position: { x: 0, y: 0 }, model: SCOUT_AGILE_2 }); // 50kg
    const task = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 8, y: 0 }, weight: 60 });
    const world = makeWorld(map, [scout], [task]);

    const bid = calculateBid(scout, task, world);
    expect(bid.feasible).toBe(false);
    expect(bid.payloadCost).toBe(Infinity);
    // Infeasible on payload alone shouldn't even attempt route planning.
    expect(bid.travelCost).toBe(Infinity);
  });

  it("lets a higher-capacity model bid on a load a smaller model cannot carry", () => {
    const map = makeMap(10, 1);
    const dynamo = makeRobot({ id: "DYNAMO", position: { x: 0, y: 0 }, model: ADDVERB_DYNAMO_100 }); // 100kg
    const task = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 8, y: 0 }, weight: 60 });
    const world = makeWorld(map, [dynamo], [task]);

    const bid = calculateBid(dynamo, task, world);
    expect(bid.feasible).toBe(true);
    expect(bid.totalCost).toBeLessThan(Infinity);
  });

  it("prefers a well-matched robot over an oversized one for the same light task (right-sizing)", () => {
    const map = makeMap(10, 1);
    const scout = makeRobot({ id: "SCOUT", position: { x: 0, y: 0 }, model: SCOUT_AGILE_2 }); // 50kg cap
    const dynamo = makeRobot({ id: "DYNAMO", position: { x: 0, y: 0 }, model: ADDVERB_DYNAMO_100 }); // 100kg cap
    const task = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 8, y: 0 }, weight: 5 });
    const world = makeWorld(map, [scout, dynamo], [task]);

    const scoutBid = calculateBid(scout, task, world);
    const dynamoBid = calculateBid(dynamo, task, world);
    // Both feasible, identical position/route/battery — the only
    // difference is how much capacity goes to waste.
    expect(scoutBid.payloadCost).toBeLessThan(dynamoBid.payloadCost);
    expect(scoutBid.totalCost).toBeLessThan(dynamoBid.totalCost);
  });

  it("has zero urgency cost when the task has no deadline", () => {
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 } });
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 } });
    const world = makeWorld(map, [robot], [task]);

    expect(calculateBid(robot, task, world).urgencyCost).toBe(0);
  });

  it("raises urgency cost sharply once a robot's ETA would miss the deadline", () => {
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 } });
    const world = (deadline: number): WorldState =>
      makeWorld(map, [robot], [makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 }, deadline })]);

    const roomyTask = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 }, deadline: 1000 });
    const tightTask = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 }, deadline: 1 });

    const roomyBid = calculateBid(robot, roomyTask, world(1000));
    const tightBid = calculateBid(robot, tightTask, world(1));
    expect(tightBid.urgencyCost).toBeGreaterThan(roomyBid.urgencyCost);
  });

  it("scales urgency cost up for a higher-priority task with the same slack", () => {
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 } });
    const lowPriority = makeTask({
      id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 }, deadline: 5, priority: 0,
    });
    const highPriority = makeTask({
      id: "T1", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 }, deadline: 5, priority: 5,
    });
    const world = makeWorld(map, [robot], [lowPriority, highPriority]);

    const lowBid = calculateBid(robot, lowPriority, world);
    const highBid = calculateBid(robot, highPriority, world);
    expect(highBid.urgencyCost).toBeGreaterThan(lowBid.urgencyCost);
  });

  it("is deterministic for identical input", () => {
    const map = makeMap(15, 15, [{ x: 5, y: 5 }]);
    const robot = makeRobot({ id: "R0", position: { x: 1, y: 1 } });
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 10 }, dropoff: { x: 3, y: 12 } });
    const world = makeWorld(map, [robot], [task]);

    const a = calculateBid(robot, task, world);
    const b = calculateBid(robot, task, world);
    expect(a).toEqual(b);
  });
});

describe("getBiddingRobots / getAllBids", () => {
  it("excludes failed robots, but a busy robot with room in its queue can still bid", () => {
    const map = makeMap(10, 1);
    const idle = makeRobot({ id: "IDLE", position: { x: 0, y: 0 } });
    const failed = makeRobot({ id: "FAILED", position: { x: 1, y: 0 }, status: "failed" });
    const busy = makeRobot({ id: "BUSY", position: { x: 2, y: 0 }, currentTaskId: "other" });
    const robots: RobotState[] = [idle, failed, busy];
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    const bidders = getBiddingRobots(task, robots, world);
    expect(bidders.map((b) => b.robotId).sort()).toEqual(["BUSY", "IDLE"]);

    // getAllBids still reports on everyone, for diagnostics.
    expect(getAllBids(task, robots, world).map((b) => b.robotId)).toEqual(["IDLE", "FAILED", "BUSY"]);
  });

  it("excludes a robot whose queue is already at the cap (accepting one more must never exceed it)", () => {
    const map = makeMap(10, 1);
    const roomy = makeRobot({
      id: "ROOMY", position: { x: 0, y: 0 }, currentTaskId: "c", queuedTaskIds: ["a", "b", "c"],
    });
    const atCap = makeRobot({
      id: "AT_CAP", position: { x: 1, y: 0 }, currentTaskId: "c", queuedTaskIds: ["a", "b", "c", "d"],
    });
    const robots: RobotState[] = [roomy, atCap];
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    expect(getBiddingRobots(task, robots, world).map((b) => b.robotId)).toEqual(["ROOMY"]);
  });

  it("excludes robots that cannot feasibly reach the task", () => {
    const map = makeMap(5, 1, [{ x: 2, y: 0 }]);
    const stuck = makeRobot({ id: "STUCK", position: { x: 0, y: 0 } });
    const task = makeTask({ id: "T0", pickup: { x: 4, y: 0 }, dropoff: { x: 3, y: 0 } });
    const world = makeWorld(map, [stuck], [task]);

    expect(getBiddingRobots(task, [stuck], world)).toEqual([]);
  });

  it("excludes a robot that's been pulled out of service to charge", () => {
    const map = makeMap(10, 1);
    const idle = makeRobot({ id: "IDLE", position: { x: 0, y: 0 } });
    const charging = makeRobot({ id: "CHARGING", position: { x: 1, y: 0 }, status: "charging" });
    const robots: RobotState[] = [idle, charging];
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    expect(getBiddingRobots(task, robots, world).map((b) => b.robotId)).toEqual(["IDLE"]);
  });

  it("excludes a robot below the hard battery floor outright, even for a cheap, easily affordable task", () => {
    const map = makeMap(10, 1);
    // 19% is below MIN_BATTERY_TO_BID_PERCENT (20) but would otherwise
    // easily clear the per-route safety-reserve check for this short hop —
    // the hard floor has to stop it regardless of route cost.
    const belowFloor = makeRobot({ id: "BELOW_FLOOR", position: { x: 0, y: 0 }, battery: 19 });
    const aboveFloor = makeRobot({ id: "ABOVE_FLOOR", position: { x: 0, y: 0 }, battery: 20 });
    const robots: RobotState[] = [belowFloor, aboveFloor];
    const task = makeTask({ id: "T0", pickup: { x: 2, y: 0 }, dropoff: { x: 4, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    expect(getBiddingRobots(task, robots, world).map((b) => b.robotId)).toEqual(["ABOVE_FLOOR"]);
  });
});

describe("updateLowBatteryStreaks", () => {
  it("increments the streak only when a robot loses specifically due to low battery", () => {
    const map = makeMap(50, 1);
    const wellCharged = makeRobot({ id: "WELL", position: { x: 0, y: 0 }, battery: 100 });
    // Above MIN_BATTERY_TO_BID_PERCENT (still eligible to bid at all) but
    // not enough for THIS specific 49-cell route without breaching the
    // safety reserve — this is what "lost specifically on battery" means,
    // distinct from being excluded from bidding outright.
    const lowBattery = makeRobot({ id: "LOW", position: { x: 0, y: 0 }, battery: 25 });
    const robots: RobotState[] = [wellCharged, lowBattery];
    const task = makeTask({ id: "T0", pickup: { x: 40, y: 0 }, dropoff: { x: 49, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    const winner = assignTask(task, robots, world);
    expect(winner?.robotId).toBe("WELL"); // the only feasible bidder

    const updated = updateLowBatteryStreaks(robots, task, world, winner?.robotId ?? null);
    const well = updated.find((r) => r.id === "WELL")!;
    const low = updated.find((r) => r.id === "LOW")!;
    expect(well.lowBatteryStreak ?? 0).toBe(0); // won, so reset
    expect(low.lowBatteryStreak).toBe(1); // lost specifically on battery
  });

  it("does not penalize a robot that simply lost to a cheaper bidder for unrelated reasons", () => {
    const map = makeMap(20, 1);
    const near = makeRobot({ id: "NEAR", position: { x: 9, y: 0 }, battery: 100 });
    const far = makeRobot({ id: "FAR", position: { x: 0, y: 0 }, battery: 100 });
    const robots: RobotState[] = [near, far];
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 0 }, dropoff: { x: 15, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    const winner = assignTask(task, robots, world);
    expect(winner?.robotId).toBe("NEAR");

    const updated = updateLowBatteryStreaks(robots, task, world, winner?.robotId ?? null);
    const far2 = updated.find((r) => r.id === "FAR")!;
    expect(far2.lowBatteryStreak ?? 0).toBe(0); // outbid, not battery-starved
  });

  it("does NOT increment the streak for a fully-charged robot that loses on an overweight task (regression)", () => {
    // Real bug found during integration stress testing: calculateBid used
    // to set batteryCost: Infinity in the overweight/unreachable branches
    // too, as generic "everything's infinite" filler. That made
    // updateLowBatteryStreaks think a 100%-charged robot was struggling on
    // battery just because a task nobody could ever carry was in the
    // batch, which mass-triggered charging trips fleet-wide with no
    // relationship to actual charge level. See infeasibleReason on RobotBid.
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 }, battery: 100, model: SCOUT_AGILE_2 });
    const overweightTask = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 8, y: 0 }, weight: 500 });
    const world = makeWorld(map, [robot], [overweightTask]);

    const winner = assignTask(overweightTask, [robot], world);
    expect(winner).toBeNull(); // nobody can carry it

    const updated = updateLowBatteryStreaks([robot], overweightTask, world, null);
    expect(updated[0].lowBatteryStreak ?? 0).toBe(0);
  });

  it("does NOT increment the streak for a fully-charged robot that loses on an unreachable task (regression)", () => {
    const map = makeMap(5, 1, [{ x: 2, y: 0 }]); // wall splits the corridor
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 }, battery: 100 });
    const unreachableTask = makeTask({ id: "T0", pickup: { x: 4, y: 0 }, dropoff: { x: 3, y: 0 } });
    const world = makeWorld(map, [robot], [unreachableTask]);

    const updated = updateLowBatteryStreaks([robot], unreachableTask, world, null);
    expect(updated[0].lowBatteryStreak ?? 0).toBe(0);
  });

  it("resets an accumulated streak back to 0 on a win", () => {
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 }, lowBatteryStreak: 2 });
    const robots: RobotState[] = [robot];
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 0 }, dropoff: { x: 9, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    const updated = updateLowBatteryStreaks(robots, task, world, "R0");
    expect(updated[0].lowBatteryStreak).toBe(0);
  });
});

describe("assignTask", () => {
  it("returns null when no robot is eligible or feasible", () => {
    const map = makeMap(5, 1);
    const failed = makeRobot({ id: "R0", position: { x: 0, y: 0 }, status: "failed" });
    const task = makeTask({ id: "T0", pickup: { x: 2, y: 0 }, dropoff: { x: 4, y: 0 } });
    const world = makeWorld(map, [failed], [task]);

    expect(assignTask(task, [failed], world)).toBeNull();
  });

  it("picks the lowest-cost eligible robot", () => {
    const map = makeMap(20, 1);
    const near = makeRobot({ id: "NEAR", position: { x: 9, y: 0 } });
    const far = makeRobot({ id: "FAR", position: { x: 0, y: 0 } });
    const robots = [near, far];
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 0 }, dropoff: { x: 15, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    const winner = assignTask(task, robots, world);
    expect(winner?.robotId).toBe("NEAR");
  });

  it("breaks exact cost ties deterministically by robotId", () => {
    const map = makeMap(20, 1);
    // Symmetric around the task so both robots have identical cost.
    const a = makeRobot({ id: "B_ROBOT", position: { x: 6, y: 0 } });
    const b = makeRobot({ id: "A_ROBOT", position: { x: 14, y: 0 } });
    const robots = [a, b];
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 0 }, dropoff: { x: 10, y: 0 } });
    const world = makeWorld(map, robots, [task]);

    const winner = assignTask(task, robots, world);
    expect(winner?.robotId).toBe("A_ROBOT");
  });

  it("is deterministic across repeated calls", () => {
    const map = makeMap(15, 15, [{ x: 7, y: 7 }]);
    const robots = [
      makeRobot({ id: "R0", position: { x: 0, y: 0 } }),
      makeRobot({ id: "R1", position: { x: 14, y: 14 } }),
      makeRobot({ id: "R2", position: { x: 0, y: 14 }, battery: 40 }),
    ];
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 5 }, dropoff: { x: 10, y: 10 } });
    const world = makeWorld(map, robots, [task]);

    const first = assignTask(task, robots, world);
    for (let i = 0; i < 10; i++) {
      expect(assignTask(task, robots, world)).toEqual(first);
    }
  });
});
