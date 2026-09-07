import type { RobotState, Task, WorldState } from "../types";
import { computeCongestion, createWarehouseMap } from "../map/warehouse";

// Mock seed data — replace with real fleet/task sourcing when available.
// Robots start with an empty path and an "assigned"/"idle" status; the
// simulation engine's own replanning pass (see engine.ts) plans their first
// A* route on tick 1, so no pathfinding logic needs to live here.
const BASE_PRIORITY = 0;

function createInitialRobots(): RobotState[] {
  return [
    {
      id: "AMR-01",
      position: { x: 1, y: 0 },
      home: { x: 1, y: 0 },
      battery: 87,
      status: "idle",
      path: [],
      priority: BASE_PRIORITY,
    },
    {
      id: "AMR-02",
      position: { x: 10, y: 4 },
      home: { x: 14, y: 0 },
      battery: 62,
      status: "assigned",
      currentTaskId: "T-102",
      path: [],
      priority: BASE_PRIORITY,
    },
    {
      id: "AMR-03",
      position: { x: 6, y: 8 },
      home: { x: 1, y: 0 },
      battery: 91,
      status: "assigned",
      currentTaskId: "T-103",
      path: [],
      priority: BASE_PRIORITY,
    },
  ];
}

function createInitialTasks(): Task[] {
  return [
    {
      id: "T-102",
      pickup: { x: 3, y: 9 },
      dropoff: { x: 9, y: 1 },
      createdAt: 0,
      priority: 1,
      status: "assigned",
      assignedRobotId: "AMR-02",
    },
    {
      id: "T-103",
      pickup: { x: 9, y: 9 },
      dropoff: { x: 13, y: 1 },
      createdAt: 1,
      priority: 1,
      status: "assigned",
      assignedRobotId: "AMR-03",
    },
    {
      id: "T-104",
      pickup: { x: 9, y: 5 },
      dropoff: { x: 1, y: 5 },
      createdAt: 2,
      priority: 1,
      status: "pending",
    },
  ];
}

export function createInitialWorld(): WorldState {
  const robots = createInitialRobots();
  const map = computeCongestion(createWarehouseMap(), robots);

  return {
    tick: 0,
    map,
    robots,
    tasks: createInitialTasks(),
    metrics: {
      replans: 0,
      conflictCount: 0,
      waitMoves: 0,
      inheritedPriorities: 0,
      backtracks: 0,
    },
  };
}
