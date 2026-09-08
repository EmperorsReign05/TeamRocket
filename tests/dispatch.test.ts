import { describe, expect, it } from "vitest";
import { runDispatchTick } from "../src/core/simulation/dispatch";
import type { Task, WorldState } from "../src/core/types";
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

describe("runDispatchTick", () => {
  it("assigns a pending task to the winning robot and starts moving it, all in one call", () => {
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 } });
    const task = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 7, y: 0 } });
    const world = makeWorld(map, [robot], [task]);

    const next = runDispatchTick(world);

    const r = next.robots[0];
    expect(r.currentTaskId).toBe("T0");
    expect(r.position).not.toEqual({ x: 0, y: 0 }); // already took its first step this same tick
    const t = next.tasks[0];
    expect(t.status).toBe("assigned");
    expect(t.assignedRobotId).toBe("R0");
  });

  it("picks the lowest-cost eligible robot, exactly like assignTask directly", () => {
    const map = makeMap(20, 1);
    const near = makeRobot({ id: "NEAR", position: { x: 9, y: 0 } });
    const far = makeRobot({ id: "FAR", position: { x: 0, y: 0 } });
    const task = makeTask({ id: "T0", pickup: { x: 10, y: 0 }, dropoff: { x: 15, y: 0 } });
    const world = makeWorld(map, [near, far], [task]);

    const next = runDispatchTick(world);
    expect(next.tasks[0].assignedRobotId).toBe("NEAR");
  });

  it("leaves a permanently-unassignable task pending forever, without throwing", () => {
    const map = makeMap(10, 1);
    const robot = makeRobot({ id: "R0", position: { x: 0, y: 0 } });
    const impossible = makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 7, y: 0 }, weight: 500 });
    let world = makeWorld(map, [robot], [impossible]);

    for (let i = 0; i < 10; i++) {
      expect(() => runDispatchTick(world)).not.toThrow();
      world = runDispatchTick(world);
    }
    expect(world.tasks[0].status).toBe("pending");
  });

  it("adds a new task to a busy robot's queue instead of its current task", () => {
    const map = makeMap(20, 1);
    const busy = makeRobot({
      id: "BUSY",
      position: { x: 0, y: 0 },
      currentTaskId: "EXISTING",
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      status: "assigned",
    });
    const existingTask = makeTask({
      id: "EXISTING", pickup: { x: 0, y: 0 }, dropoff: { x: 2, y: 0 }, status: "in_progress", assignedRobotId: "BUSY",
    });
    const newTask = makeTask({ id: "NEW", pickup: { x: 10, y: 0 }, dropoff: { x: 15, y: 0 } });
    const world = makeWorld(map, [busy], [existingTask, newTask]);

    const next = runDispatchTick(world);
    const r = next.robots[0];
    expect(r.currentTaskId).toBe("EXISTING"); // unchanged, still finishing what it's doing
    expect(r.queuedTaskIds).toContain("NEW");
    expect(next.tasks.find((t) => t.id === "NEW")?.assignedRobotId).toBe("BUSY");
  });

  it("is deterministic across repeated calls on the same input", () => {
    const map = makeMap(15, 15, [{ x: 7, y: 7 }]);
    const robots = [
      makeRobot({ id: "R0", position: { x: 0, y: 0 } }),
      makeRobot({ id: "R1", position: { x: 14, y: 14 } }),
    ];
    const task = makeTask({ id: "T0", pickup: { x: 5, y: 5 }, dropoff: { x: 10, y: 10 } });
    const world = makeWorld(map, robots, [task]);

    const a = runDispatchTick(world);
    const b = runDispatchTick(world);
    expect(a).toEqual(b);
  });

  it("runs the whole pipeline for many ticks without ever double-booking a task", () => {
    const map = makeMap(15, 1);
    const robots = [
      makeRobot({ id: "R0", position: { x: 0, y: 0 } }),
      makeRobot({ id: "R1", position: { x: 14, y: 0 } }),
    ];
    const tasks = [
      makeTask({ id: "T0", pickup: { x: 3, y: 0 }, dropoff: { x: 5, y: 0 } }),
      makeTask({ id: "T1", pickup: { x: 9, y: 0 }, dropoff: { x: 11, y: 0 } }),
    ];
    let world: WorldState = makeWorld(map, robots, tasks);

    for (let tick = 0; tick < 100; tick++) {
      expect(() => runDispatchTick(world), `tick ${tick}`).not.toThrow();
      world = runDispatchTick(world);

      const owners = new Map<string, string[]>();
      for (const r of world.robots) {
        if (r.currentTaskId) owners.set(r.currentTaskId, [...(owners.get(r.currentTaskId) ?? []), r.id]);
      }
      for (const t of world.tasks) {
        if (t.status === "assigned" || t.status === "in_progress") {
          expect(owners.get(t.id)?.length ?? 0, `tick ${tick}: task ${t.id}`).toBe(1);
        }
      }
    }

    const completed = world.tasks.filter((t) => t.status === "completed").length;
    expect(completed).toBeGreaterThan(0);
  });
});
