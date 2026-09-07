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
  | "failed";

export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed";

export type RobotState = {
  id: string;

  position: Position;
  home: Position;

  battery: number;
  status: RobotStatus;

  currentTaskId?: string;

  // Intended route, including the current position as path[0].
  // A* (re)plans this; PIBT only ever executes the next step of it.
  path: Position[];

  // Higher priority wins conflicts during PIBT resolution.
  priority: number;
};

export type Task = {
  id: string;

  pickup: Position;
  dropoff: Position;

  createdAt: number;
  priority: number;

  status: TaskStatus;

  assignedRobotId?: string;
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

export type WorldState = {
  tick: number;

  map: WarehouseMap;
  robots: RobotState[];
  tasks: Task[];
};
