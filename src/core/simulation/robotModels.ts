import type { RobotModel, RobotState } from "../types";

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

// Battery percent consumed per grid cell moved. Shared between the
// auction's feasibility/cost estimate (auction/cost.ts) and the engine's
// actual per-tick drain (simulation/engine.ts) — one source of truth so a
// bid's "can this robot afford the trip" check and what the simulation
// actually does to the robot's battery never disagree. Every robot shares
// one rate regardless of model for now.
export const BATTERY_PERCENT_PER_CELL = 0.5;

// Battery percent regained per tick while parked at a charging station.
export const CHARGE_PERCENT_PER_TICK = 2;

// Opportunity charging, not full charging: a robot leaves once it's back to
// a comfortable working level, not necessarily 100%. Deliberate choice —
// stress testing showed that with only 2 shared stations, mandatory full
// recharges (up to ~50 ticks per occupant at 2%/tick) queued robots behind
// each other badly. A shorter, more frequent top-up turns a station over
// faster, which matters more than any one robot leaving fully charged.
// Comfortably above MIN_BATTERY_TO_BID_PERCENT so a robot doesn't leave the
// station only to immediately need to bid below the floor again.
export const RECHARGE_TARGET_PERCENT = 50;

// Hard floor: a robot below this charge cannot bid on anything, full stop,
// regardless of lowBatteryStreak. This exists independently of the streak
// mechanism because the streak only accumulates while a robot is actually
// being evaluated in auctions — a robot that drops below this floor must
// stop bidding immediately, not "eventually, after a few more losses."
export const MIN_BATTERY_TO_BID_PERCENT = 20;

// How many consecutive auction rounds a robot can be evaluated and passed
// over specifically for low battery before the engine gives up on letting
// it keep bidding and sends it to charge instead. Shared between the
// auction (isEligible excludes a robot already mid-charging-cycle) and the
// engine (decides when to actually trigger the trip) — see
// src/core/auction/assign.ts and src/core/simulation/engine.ts.
export const LOW_BATTERY_STREAK_THRESHOLD = 3;

// Either signal is enough on its own: a robot that's crossed the hard
// floor needs to charge immediately, even if it hasn't yet racked up 3
// losses (it may not get the chance to — see isEligible, which stops it
// from bidding, and therefore from ever being evaluated again, the moment
// it crosses MIN_BATTERY_TO_BID_PERCENT). The streak alone still matters
// for a robot above the floor that keeps failing specific long routes.
export function needsToCharge(robot: RobotState): boolean {
  return (robot.lowBatteryStreak ?? 0) >= LOW_BATTERY_STREAK_THRESHOLD || robot.battery < MIN_BATTERY_TO_BID_PERCENT;
}
