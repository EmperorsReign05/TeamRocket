'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type RobotStatus = 'idle' | 'moving' | 'charging' | 'blocked' | 'conflict';
export type TaskStatus = 'pending' | 'assigned' | 'in-progress' | 'completed';
export type LogEntry = { time: string; text: string; type: 'info' | 'warning' | 'success' };
export type Cell = { x: number; y: number };
export type Robot = Cell & { id: string; status: RobotStatus; battery: number; targetX: number; targetY: number; taskId?: string; distanceTravelled: number; batteryHistory: number[]; uptimeSeconds: number };
export type Task = { id: string; pickup: Cell; dropoff: Cell; status: TaskStatus; assignedRobotId?: string; phase: 'pickup' | 'dropoff'; createdAt: number; startedAt?: number; completedAt?: number };
export type SimulationState = { robots: Robot[]; tasks: Task[]; logs: LogEntry[]; blockedCells: string[]; completedDurations: number[]; conflictsResolved: number; totalDistance: number };

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 13;
export const CHARGING_POINTS: Cell[] = [{ x: 1, y: 0 }, { x: 14, y: 0 }];
export const SHELF_BLOCKS = [[1, 1, 2, 3], [1, 9, 2, 3], [4, 1, 2, 3], [4, 5, 2, 3], [4, 9, 2, 3], [7, 1, 2, 3], [7, 5, 2, 3], [7, 9, 2, 3], [10, 1, 2, 3], [10, 5, 2, 3], [10, 9, 2, 3], [15, 1, 2, 3], [15, 5, 2, 3], [15, 9, 2, 3], [18, 1, 2, 3], [18, 5, 2, 3], [18, 9, 2, 3]];
const initialNow = Date.now();
const INITIAL_LOGS: LogEntry[] = [
  { time: '14:32', text: 'AMR-01 docked at P1', type: 'info' },
  { time: '14:31', text: 'AMR-02 reserved i05 (t=12-14s)', type: 'info' },
  { time: '14:31', text: 'AMR-03 waiting at W2 (aisle busy)', type: 'warning' },
  { time: '14:30', text: 'Task T-102 assigned to AMR-02', type: 'info' },
  { time: '14:29', text: 'AMR-03 reached waiting zone W2', type: 'info' },
  { time: '14:28', text: 'Path planned for AMR-03', type: 'info' },
  { time: '14:27', text: 'Task T-103 created', type: 'info' },
  { time: '14:26', text: 'AMR-02 passed intersection i08', type: 'info' },
  { time: '14:25', text: 'System initialized', type: 'success' },
];
const INITIAL_TASKS: Task[] = [
  { id: 'T-102', pickup: { x: 10, y: 4 }, dropoff: { x: 17, y: 12 }, status: 'in-progress', assignedRobotId: 'AMR-02', phase: 'dropoff', createdAt: initialNow - 32000, startedAt: initialNow - 30000 },
  { id: 'T-103', pickup: { x: 6, y: 8 }, dropoff: { x: 14, y: 12 }, status: 'assigned', assignedRobotId: 'AMR-03', phase: 'pickup', createdAt: initialNow - 25000 },
  { id: 'T-104', pickup: { x: 4, y: 4 }, dropoff: { x: 1, y: 0 }, status: 'pending', phase: 'pickup', createdAt: initialNow - 12000 },
];
const INITIAL_ROBOTS: Robot[] = [
  { id: 'AMR-01', x: 1, y: 1, targetX: 1, targetY: 1, status: 'idle', battery: 87, distanceTravelled: 0, batteryHistory: [87], uptimeSeconds: 3600 },
  { id: 'AMR-02', x: 10, y: 4, targetX: 17, targetY: 12, status: 'moving', battery: 62, taskId: 'T-102', distanceTravelled: 0, batteryHistory: [62], uptimeSeconds: 3600 },
  { id: 'AMR-03', x: 6, y: 8, targetX: 6, targetY: 8, status: 'idle', battery: 91, taskId: 'T-103', distanceTravelled: 0, batteryHistory: [91], uptimeSeconds: 3600 },
];

const key = (cell: Cell) => `${cell.x},${cell.y}`;
const distance = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const inside = (cell: Cell) => cell.x >= 0 && cell.x < GRID_WIDTH && cell.y >= 0 && cell.y < GRID_HEIGHT;
const shelfCell = (cell: Cell) => SHELF_BLOCKS.some(([x, y, width, height]) => cell.x >= x && cell.x < x + width && cell.y >= y && cell.y < y + height);
const logTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const addLog = (logs: LogEntry[], text: string, type: LogEntry['type'] = 'info') => [...logs, { time: logTime(), text, type }].slice(-80);

export function findPath(start: Cell, target: Cell, blocked: string[]): Cell[] {
  if (key(start) === key(target)) return [];
  const queue: Cell[] = [start];
  const previous = new globalThis.Map<string, Cell | null>([[key(start), null]]);
  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = [{ x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y }, { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }];
    for (const next of neighbors) {
      const nextKey = key(next);
      if (!inside(next) || shelfCell(next) || blocked.includes(nextKey) || previous.has(nextKey)) continue;
      previous.set(nextKey, current);
      if (nextKey === key(target)) {
        const path: Cell[] = [];
        let cursor: Cell | null = next;
        while (cursor && key(cursor) !== key(start)) { path.unshift(cursor); cursor = previous.get(key(cursor)) ?? null; }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

export function createInitialState(): SimulationState {
  return { robots: INITIAL_ROBOTS.map(robot => ({ ...robot, batteryHistory: [...robot.batteryHistory] })), tasks: INITIAL_TASKS.map(task => ({ ...task })), logs: [...INITIAL_LOGS], blockedCells: [], completedDurations: [], conflictsResolved: 0, totalDistance: 0 };
}

function tick(state: SimulationState): SimulationState {
  let logs = state.logs;
  const tasks = state.tasks.map(task => ({ ...task }));
  const robots = state.robots.map(robot => ({ ...robot, batteryHistory: [...robot.batteryHistory] }));
  const completedDurations = [...state.completedDurations];
  let conflictsResolved = state.conflictsResolved;
  const proposals = new globalThis.Map<string, Cell>();

  for (const task of tasks.filter(candidate => candidate.status === 'pending')) {
    const robot = robots.filter(candidate => candidate.status === 'idle' && !candidate.taskId).sort((a, b) => distance(a, task.pickup) - distance(b, task.pickup))[0];
    if (robot) { task.status = 'assigned'; task.assignedRobotId = robot.id; robot.taskId = task.id; robot.targetX = task.pickup.x; robot.targetY = task.pickup.y; robot.status = 'moving'; logs = addLog(logs, `${task.id} assigned to ${robot.id}.`, 'success'); }
  }

  for (const robot of robots) {
    let task = robot.taskId ? tasks.find(candidate => candidate.id === robot.taskId) : undefined;
    if (robot.battery <= 20 && robot.status !== 'charging') {
      const point = CHARGING_POINTS.reduce((nearest, candidate) => distance(robot, candidate) < distance(robot, nearest) ? candidate : nearest);
      robot.targetX = point.x; robot.targetY = point.y; robot.status = 'charging'; logs = addLog(logs, `${robot.id} battery low; rerouting to charge at (${point.x},${point.y}).`, 'warning');
    }
    if (robot.status === 'charging' && CHARGING_POINTS.some(point => key(point) === key(robot))) {
      robot.battery = Math.min(100, robot.battery + 8);
      if (robot.battery >= 84 && task) { robot.targetX = task.phase === 'pickup' ? task.pickup.x : task.dropoff.x; robot.targetY = task.phase === 'pickup' ? task.pickup.y : task.dropoff.y; robot.status = 'moving'; logs = addLog(logs, `${robot.id} recharged and resumed ${task.id}.`, 'success'); }
    }
    task = robot.taskId ? tasks.find(candidate => candidate.id === robot.taskId) : undefined;
    if (task && robot.status !== 'charging') {
      const destination = task.phase === 'pickup' ? task.pickup : task.dropoff;
      robot.targetX = destination.x; robot.targetY = destination.y;
      if (key(robot) === key(destination)) {
        if (task.phase === 'pickup') { task.phase = 'dropoff'; task.status = 'in-progress'; task.startedAt = task.startedAt ?? Date.now(); robot.targetX = task.dropoff.x; robot.targetY = task.dropoff.y; robot.status = 'moving'; logs = addLog(logs, `${robot.id} picked up ${task.id}; routing to drop-off.`); }
        else { task.status = 'completed'; task.completedAt = Date.now(); completedDurations.push((task.completedAt - task.createdAt) / 1000); robot.taskId = undefined; robot.targetX = robot.x; robot.targetY = robot.y; robot.status = 'idle'; logs = addLog(logs, `${task.id} completed by ${robot.id} at (${robot.x},${robot.y}).`, 'success'); task = undefined; }
      } else if (task.status === 'assigned') task.status = 'in-progress';
    }
    if (robot.status === 'idle' && !task && key(robot) === key({ x: robot.targetX, y: robot.targetY })) continue;
    const wasBlocked = robot.status === 'blocked';
    if (robot.status === 'blocked' || robot.status === 'conflict') robot.status = 'moving';
    const path = findPath(robot, { x: robot.targetX, y: robot.targetY }, state.blockedCells);
    if (path.length) proposals.set(robot.id, path[0]);
    else if (key(robot) !== key({ x: robot.targetX, y: robot.targetY })) { if (!wasBlocked) logs = addLog(logs, `${robot.id} cannot reach (${robot.targetX},${robot.targetY}); holding position.`, 'warning'); if (task) { task.status = 'pending'; task.assignedRobotId = undefined; robot.taskId = undefined; logs = addLog(logs, `${task.id} released from ${robot.id}; waiting for a reroute-capable robot.`, 'warning'); } robot.status = 'blocked'; }
  }

  const yielded = new Set<string>();
  for (let index = 0; index < robots.length; index += 1) for (let otherIndex = index + 1; otherIndex < robots.length; otherIndex += 1) {
    const first = robots[index]; const second = robots[otherIndex]; const firstNext = proposals.get(first.id); const secondNext = proposals.get(second.id);
    const sameCell = firstNext && secondNext && key(firstNext) === key(secondNext);
    const crossing = firstNext && secondNext && key(firstNext) === key(second) && key(secondNext) === key(first);
    if (sameCell || crossing) { const winner = first.id < second.id ? first : second; const loser = winner.id === first.id ? second : first; proposals.delete(loser.id); yielded.add(loser.id); conflictsResolved += 1; const target = firstNext ?? secondNext!; logs = addLog(logs, `${loser.id} yielded to ${winner.id} at (${target.x},${target.y}) to avoid collision.`, 'warning'); }
  }
  for (const robot of robots) { const next = proposals.get(robot.id); if (yielded.has(robot.id)) { robot.status = 'conflict'; continue; } if (next) { robot.x = next.x; robot.y = next.y; robot.distanceTravelled += 1; robot.battery = Math.max(0, robot.battery - (robot.status === 'charging' ? 0.1 : 0.8)); robot.batteryHistory = [...robot.batteryHistory.slice(-23), Math.round(robot.battery)]; robot.uptimeSeconds += 0.7; if (robot.status !== 'charging') robot.status = 'moving'; } }
  return { ...state, robots, tasks, logs, completedDurations, conflictsResolved, totalDistance: state.totalDistance + robots.filter(robot => proposals.has(robot.id) && !yielded.has(robot.id)).length };
}

type SimulationContextValue = SimulationState & { isSimulationRunning: boolean; tickMs: number; setTickMs: (value: number) => void; completedTasks: number; activeTasks: number; averageCompletionTime: number; fleetUtilization: number; handleCreateTask: () => void; handleToggleSimulation: () => void; handleSimulateConflict: () => void; handleSimulateDeadlock: () => void; handleFailRobot: () => void; handleBlockAisle: () => void; handleResetSimulation: () => void };
const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulation, setSimulation] = useState<SimulationState>(createInitialState);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [tickMs, setTickMs] = useState(700);
  useEffect(() => { if (!isSimulationRunning) return undefined; const timer = setInterval(() => setSimulation(previous => tick(previous)), tickMs); return () => clearInterval(timer); }, [isSimulationRunning, tickMs]);
  const value = useMemo<SimulationContextValue>(() => {
    const completedTasks = simulation.tasks.filter(task => task.status === 'completed').length;
    const activeTasks = simulation.tasks.filter(task => task.status !== 'completed').length;
    const averageCompletionTime = simulation.completedDurations.length ? simulation.completedDurations.reduce((total, duration) => total + duration, 0) / simulation.completedDurations.length : 0;
    const fleetUtilization = Math.round((simulation.robots.filter(robot => robot.status !== 'idle').length / simulation.robots.length) * 100);
    const handleCreateTask = () => setSimulation(previous => { const nextNumber = Math.max(104, ...previous.tasks.map(task => Number(task.id.replace('T-', '')) + 1)); const routes = [{ pickup: { x: 12, y: 4 }, dropoff: { x: 17, y: 12 } }, { pickup: { x: 13, y: 8 }, dropoff: { x: 14, y: 0 } }, { pickup: { x: 4, y: 4 }, dropoff: { x: 1, y: 0 } }]; const route = routes[(nextNumber - 104) % routes.length]; const robot = previous.robots.filter(candidate => candidate.status === 'idle' && !candidate.taskId).sort((a, b) => distance(a, route.pickup) - distance(b, route.pickup))[0]; const task: Task = { id: `T-${nextNumber}`, ...route, status: robot ? 'assigned' : 'pending', assignedRobotId: robot?.id, phase: 'pickup', createdAt: Date.now() }; const robots = previous.robots.map(candidate => candidate.id === robot?.id ? { ...candidate, taskId: task.id, targetX: route.pickup.x, targetY: route.pickup.y, status: 'moving' as RobotStatus } : candidate); return { ...previous, robots, tasks: [...previous.tasks, task], logs: addLog(previous.logs, robot ? `${task.id} assigned to ${robot.id}.` : `${task.id} queued; waiting for an idle robot.`, robot ? 'success' : 'info') }; });
    const handleToggleSimulation = () => setIsSimulationRunning(running => !running);
    const handleSimulateConflict = () => { setSimulation(previous => ({ ...previous, robots: previous.robots.map(robot => robot.id === 'AMR-01' ? { ...robot, taskId: undefined, targetX: 6, targetY: 8, status: 'moving' as RobotStatus } : robot.id === 'AMR-03' ? { ...robot, taskId: undefined, targetX: 1, targetY: 1, status: 'moving' as RobotStatus } : robot), tasks: previous.tasks.map(task => task.assignedRobotId === 'AMR-03' && task.status !== 'completed' ? { ...task, assignedRobotId: undefined, status: 'pending' as TaskStatus } : task), logs: addLog(previous.logs, 'Conflict drill armed: AMR-01 and AMR-03 assigned intersecting routes.', 'warning') })); setIsSimulationRunning(true); };
    const handleBlockAisle = () => setSimulation(previous => { const cell = previous.blockedCells.includes('10,5') ? '10,6' : '10,5'; return { ...previous, blockedCells: [...previous.blockedCells.filter(blocked => blocked !== '10,5' && blocked !== '10,6'), cell], logs: addLog(previous.logs, `Aisle cell (${cell}) marked blocked; routes will be recomputed.`, 'warning') }; });
    const handleFailRobot = () => setSimulation(previous => ({ ...previous, robots: previous.robots.map(robot => robot.id === 'AMR-02' ? { ...robot, battery: 8, status: 'charging' as RobotStatus } : robot), logs: addLog(previous.logs, 'AMR-02 fault injected; emergency charging route requested.', 'warning') }));
    const handleResetSimulation = () => { setIsSimulationRunning(false); setSimulation(createInitialState()); };
    return { ...simulation, isSimulationRunning, tickMs, setTickMs, completedTasks, activeTasks, averageCompletionTime, fleetUtilization, handleCreateTask, handleToggleSimulation, handleSimulateConflict, handleSimulateDeadlock: handleSimulateConflict, handleFailRobot, handleBlockAisle, handleResetSimulation };
  }, [simulation, isSimulationRunning, tickMs]);
  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() { const context = useContext(SimulationContext); if (!context) throw new Error('useSimulation must be used inside SimulationProvider'); return context; }
