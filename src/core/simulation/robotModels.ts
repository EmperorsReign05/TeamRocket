import type { RobotModel } from "../types";

// Single source of truth for the fleet's robot models — mirrors the "one
// map source" rule for warehouse layout: don't hardcode model names/specs
// separately in the UI, seed data, and tests.

export const SCOUT_AGILE_2: RobotModel = {
  model: "Scout Agile 2.0",
  payloadCapacity: 50,
};

export const ADDVERB_DYNAMO_100: RobotModel = {
  model: "Addverb Dynamo 100",
  payloadCapacity: 100,
};

export const ROBOT_MODELS: readonly RobotModel[] = [SCOUT_AGILE_2, ADDVERB_DYNAMO_100];
