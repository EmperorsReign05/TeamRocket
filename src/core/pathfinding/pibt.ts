import type { Position, RobotState, WarehouseMap, WorldState } from "../types";
import { getNeighbors, manhattanDistance, positionKey, positionsEqual } from "../map/graph";
import { isTraversable } from "../map/warehouse";

// Answers: "given every robot's intended path, which NEXT MOVE may each
// robot safely execute THIS TICK?" A* (astar.ts) already decided the route;
// PIBT only ever resolves the immediate next-step conflicts between robots
// that want the route. It never plans global routes itself.
//
// This is real Priority Inheritance with Backtracking (Okumura et al.,
// 2019), not a greedy first-come-first-served resolver:
//   - robots are attempted in priority order
//   - a robot whose preferred cell is occupied by a lower-effective-priority
//     robot recursively forces that occupant to try to move out of the way,
//     temporarily inheriting the requester's urgency for that one recursive
//     call only (RobotState.priority — the persistent base priority — is
//     never mutated by this; see engine.ts for how base priority evolves
//     tick-to-tick)
//   - if an occupant has no viable escape, the requester backtracks to its
//     next candidate cell instead of giving up immediately
//
// Known, deliberate scope limit: cycles longer than a direct 2-robot swap
// (e.g. a 3-robot rotation A->B->C->A) are conservatively treated as
// unresolvable and all participants wait, rather than being resolved into a
// simultaneous rotation. Full academic PIBT can resolve those; doing so
// safely requires more bookkeeping than this scaffold's contract asks for,
// and waiting is always safe. See resolveCandidate's `inProgress` check.
export type PlannedMove = {
  robotId: string;
  from: Position;
  to: Position;
};

export type PIBTMetrics = {
  // A candidate was rejected because another robot had already reserved it
  // as its destination this tick, or the recursive push into an occupant
  // failed to free it up.
  conflictCount: number;
  // Robots whose final action this tick was WAIT (to === from).
  waitMoves: number;
  // Number of times a robot recursively forced another (undecided) robot to
  // try to move out of its way.
  inheritedPriorities: number;
  // Number of times a robot's preferred candidate was rejected and it moved
  // on to try the next one.
  backtracks: number;
};

export type PIBTResult = {
  moves: PlannedMove[];
  metrics: PIBTMetrics;
};

function rowMajorIndex(pos: Position, map: WarehouseMap): number {
  return pos.y * map.width + pos.x;
}

// Candidate ranking for robot `r`:
//   1. its preferred next A* path cell (path[1]), if it has one
//   2. other traversable neighbors, ranked by how much closer they get the
//      robot to its route's ultimate goal (path[path.length - 1])
//   3. WAIT at its current cell, always last, always available
//
// A robot with no active route (empty path) that is not being recursively
// pushed has nothing to do and no reason to explore neighbors — it just
// waits, so idle/parked robots don't wander. A robot with no route that IS
// being pushed (something else needs its cell) still needs somewhere to go,
// so it falls through to full neighbor exploration.
//
// A robot that DOES have a real preferred move is only allowed to fall back
// to alternates that strictly reduce its own distance to goal WHEN IT IS
// ACTING ON ITS OWN INITIATIVE (not being pushed) — otherwise, if its first
// choice is contested, it would happily wander to a farther cell just
// because nothing stopped it, achieving nothing. A robot that IS being
// recursively pushed has a different job right then (get out of the
// requester's way), so it may accept any safe neighbor even if it doesn't
// help its own route — that's exactly what the spec-15 backtracking example
// requires of the middle robot in a push chain.
//
// When being pushed and candidates tie on distance-to-goal, prefer stepping
// OFF the caller's line of approach over continuing straight past the
// robot's own current cell in the same direction the caller is coming from.
// A collinear "retreat" just relocates the same conflict one cell further
// down the corridor every tick (the caller catches up and pushes again next
// tick); a perpendicular step actually gets out of the way. This is what
// lets a robot duck into a passing bay instead of endlessly backing down a
// corridor it's sharing with an oncoming robot.
function getCandidates(
  robot: RobotState,
  map: WarehouseMap,
  callerPosition: Position | null
): Position[] {
  const from = robot.position;
  const preferred = robot.path.length > 1 ? robot.path[1] : undefined;
  const beingPushed = callerPosition !== null;

  if (!preferred && !beingPushed) {
    return [from];
  }

  const goal = robot.path.length > 0 ? robot.path[robot.path.length - 1] : from;
  const currentDistance = manhattanDistance(from, goal);

  let alternates = getNeighbors(from, map).filter((n) => !preferred || !positionsEqual(n, preferred));
  if (preferred && !beingPushed) {
    alternates = alternates.filter((n) => manhattanDistance(n, goal) < currentDistance);
  }

  const pushDir = callerPosition ? { x: from.x - callerPosition.x, y: from.y - callerPosition.y } : null;
  const isCollinearRetreat = (n: Position) =>
    pushDir !== null && n.x - from.x === pushDir.x && n.y - from.y === pushDir.y;

  const ranked = alternates.sort((a, b) => {
    const da = manhattanDistance(a, goal);
    const db = manhattanDistance(b, goal);
    if (da !== db) return da - db;
    const aRetreat = isCollinearRetreat(a) ? 1 : 0;
    const bRetreat = isCollinearRetreat(b) ? 1 : 0;
    if (aRetreat !== bRetreat) return aRetreat - bRetreat;
    return rowMajorIndex(a, map) - rowMajorIndex(b, map);
  });

  const candidates: Position[] = [];
  if (preferred) candidates.push(preferred);
  candidates.push(...ranked);
  candidates.push(from);
  return candidates;
}

type ResolutionState = {
  map: WarehouseMap;
  robotsById: Map<string, RobotState>;
  occupantByCell: Map<string, string>; // static, pre-tick occupancy
  decided: Map<string, PlannedMove>;
  reservedNext: Map<string, string>; // cellKey -> robotId that will occupy it
  inProgress: Set<string>; // robot ids currently on the recursion stack
  metrics: PIBTMetrics;
};

// Attempts to decide robot `robotId`'s move. `callerId` is set when this is
// a recursive "please get out of my way" push from another robot resolving
// its own move; null for a top-level attempt.
//
// Returns true if the robot ends up somewhere other than where it started
// (i.e. it successfully vacated its original cell) — this is exactly what a
// caller needs to know to know whether ITS candidate cell is now free.
function resolveCandidate(robotId: string, callerId: string | null, state: ResolutionState): boolean {
  const existing = state.decided.get(robotId);
  if (existing) {
    return !positionsEqual(existing.from, existing.to);
  }

  if (state.inProgress.has(robotId)) {
    // Cycle back to an ancestor already being resolved on this call stack —
    // see the "known scope limit" note at the top of this file.
    return false;
  }

  const robot = state.robotsById.get(robotId)!;
  state.inProgress.add(robotId);

  const callerPosition = callerId ? state.robotsById.get(callerId)!.position : null;
  const candidates = getCandidates(robot, state.map, callerPosition);
  let chosen: Position | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const isWait = positionsEqual(candidate, robot.position);

    if (isWait) {
      // By construction, nobody can have claimed this robot's own current
      // cell before this robot itself decides — see file-level reasoning in
      // resolvePIBT. Always safe, always available as the last resort.
      chosen = candidate;
      break;
    }

    if (i > 0) {
      state.metrics.backtracks += 1;
    }

    // Safety net: a candidate must be traversable AND exactly one
    // orthogonal step away, regardless of where it came from.
    // getCandidates() only ever generates adjacent, traversable neighbors
    // itself, but `preferred` is taken directly from robot.path, which this
    // function must not trust blindly — a stale/corrupt path (e.g. a
    // waypoint that skipped a cell) should never be able to make PIBT walk
    // a robot into a wall, or "teleport" it past a cell without the normal
    // occupancy/reservation checks ever looking at what's actually there.
    if (!isTraversable(candidate, state.map) || manhattanDistance(candidate, robot.position) !== 1) {
      continue;
    }

    if (callerPosition && positionsEqual(candidate, callerPosition)) {
      // Never step into the direct caller's current cell — this is exactly
      // what prevents a 2-robot head-on swap.
      continue;
    }

    const destKey = positionKey(candidate);

    const reservedBy = state.reservedNext.get(destKey);
    if (reservedBy && reservedBy !== robotId) {
      state.metrics.conflictCount += 1;
      continue;
    }

    const occupant = state.occupantByCell.get(destKey);
    if (occupant && occupant !== robotId && !state.decided.has(occupant)) {
      state.metrics.inheritedPriorities += 1;
      const vacated = resolveCandidate(occupant, robotId, state);
      if (!vacated) {
        state.metrics.conflictCount += 1;
        continue;
      }
    }

    chosen = candidate;
    break;
  }

  state.inProgress.delete(robotId);

  const to = chosen ?? robot.position;
  const move: PlannedMove = { robotId, from: robot.position, to };
  state.decided.set(robotId, move);
  state.reservedNext.set(positionKey(to), robotId);
  if (positionsEqual(to, robot.position)) {
    state.metrics.waitMoves += 1;
  }

  return !positionsEqual(to, robot.position);
}

export function resolvePIBT(robots: RobotState[], world: WorldState): PIBTResult {
  const map = world.map;

  const state: ResolutionState = {
    map,
    robotsById: new Map(robots.map((r) => [r.id, r])),
    occupantByCell: new Map(robots.map((r) => [positionKey(r.position), r.id])),
    decided: new Map(),
    reservedNext: new Map(),
    inProgress: new Set(),
    metrics: { conflictCount: 0, waitMoves: 0, inheritedPriorities: 0, backtracks: 0 },
  };

  // Failed robots never move, decide them first so they act as static
  // obstacles nobody else can be recursively pushed into replacing.
  for (const robot of robots) {
    if (robot.status === "failed") {
      const move: PlannedMove = { robotId: robot.id, from: robot.position, to: robot.position };
      state.decided.set(robot.id, move);
      state.reservedNext.set(positionKey(robot.position), robot.id);
      state.metrics.waitMoves += 1;
    }
  }

  // Base priority (RobotState.priority, managed by the simulation engine
  // across ticks) sets processing order; id breaks ties deterministically.
  const ordered = [...robots].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });

  for (const robot of ordered) {
    if (!state.decided.has(robot.id)) {
      resolveCandidate(robot.id, null, state);
    }
  }

  const moves = ordered.map((r) => state.decided.get(r.id)!);
  return { moves, metrics: state.metrics };
}
