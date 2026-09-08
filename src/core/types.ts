// Shared domain contract for the fleet simulation.
//
// Every algorithm module (auction, pathfinding, PIBT, simulation) and every
// UI module depends on these types. There must be exactly one definition of
// each concept here — do not create parallel types (e.g. a second position
// type) elsewhere in the codebase.
//
// This file must stay framework-independent: no React, no DOM types.

export type Position = {
  x: number;
  y: number;
};

export type RobotStatus =
  | "idle"
  | "assigned"
  | "moving"
  | "waiting"
  | "failed"
  | "charging";

export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed";

export type RobotState = {
  id: string;

  position: Position;
  home: Position;

  battery: number;
  status: RobotStatus;
  model: RobotModel;

  currentTaskId?: string;

  // Task IDs waiting behind currentTaskId — a robot can bid on and win
  // new work while still busy, up to a backlog cap (see
  // src/core/auction/assign.ts's isEligible). Optional/defaults to empty
  // so existing code that never touches queuing keeps compiling.
  queuedTaskIds?: string[];

  // Consecutive auction rounds this robot was evaluated and passed over
  // specifically because of low battery (not payload, not unreachable),
  // without winning anything. Resets to 0 on any win. Once it crosses
  // src/core/simulation/robotModels.ts's LOW_BATTERY_STREAK_THRESHOLD, the
  // engine takes the robot out of service and routes it to the nearest
  // charging station instead of leaving it to keep losing bids forever.
  // Optional/defaults to 0 for existing code that never touches this.
  lowBatteryStreak?: number;

  // Intended route, including the current position as path[0].
  // A* (re)plans this; PIBT only ever executes the next step of it.
  path: Position[];

  // Higher priority wins conflicts during PIBT resolution.
  priority: number;
};

export type RobotModel = {
  model: string;
  payloadCapacity: number;
};

export type TaskState = {
  current_task: Task;
  queued_tasks: Task[];
};

export type Task = {
  id: string;

  pickup: Position;
  dropoff: Position;

  // kg — compared against RobotModel.payloadCapacity when bidding. Every
  // real task has a weight, so unlike deadline this isn't optional.
  weight: number;

  createdAt: number;
  priority: number;

  status: TaskStatus;

  assignedRobotId?: string;

  // Absolute simulation TICK (not a wall-clock timestamp) by which the
  // task should be complete. Optional and additive — existing code/tests
  // that don't set it are unaffected; the auction treats a missing
  // deadline as "no urgency signal" rather than requiring one.
  deadline?: number;
};

export type Cell = {
  position: Position;

  blocked: boolean;

  // Current traffic pressure / number of robots affecting this cell.
  // Consumed by A* as an edge-cost penalty.
  congestion: number;
};

export type WarehouseMap = {
  width: number;
  height: number;
  cells: Cell[];
};

// Cumulative pathfinding/coordination counters, carried on WorldState so the
// dashboard can read them without reaching into engine internals. The
// simulation engine adds each tick's PIBT/A* activity into these running
// totals — see src/core/simulation/engine.ts.
export type PathfindingMetrics = {
  replans: number;
  conflictCount: number;
  waitMoves: number;
  inheritedPriorities: number;
  backtracks: number;
};

export type WorldState = {
  tick: number;

  map: WarehouseMap;
  robots: RobotState[];
  tasks: Task[];

  metrics: PathfindingMetrics;
};
