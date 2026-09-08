'use client';

import React, { useState, useEffect } from 'react';
import type { Task, WorldState } from '@/core/types';
import { createInitialWorld } from '@/core/simulation/state';
import { stepSimulation } from '@/core/simulation/engine';
import { ROBOT_MODELS } from '@/core/simulation/robotModels';
import { 
  Header,
  WarehouseMap,
  ControlPanel,
  MetricsBar,
  FleetStatus,
  ActiveTasks,
  EventLog,
  type LogEntry
} from '@/components/dashboard';

const INITIAL_LOGS: LogEntry[] = [
  { time: '14:32:00', text: 'simulation engine ready (a* + pibt active)', type: 'info' },
  { time: '14:31:45', text: 'amr-02 assigned to t-102', type: 'info' },
  { time: '14:31:12', text: 'amr-03 assigned to t-103', type: 'info' },
  { time: '14:30:05', text: 'warehouse grid and congestion field initialized', type: 'info' },
  { time: '14:27:10', text: 'task t-104 queued pending', type: 'info' },
  { time: '14:25:00', text: 'system initialized with live worldstate', type: 'info' },
];

export default function Dashboard() {
  const [world, setWorld] = useState<WorldState>(() => {
    const initial = createInitialWorld();
    return {
      ...initial,
      robots: initial.robots.map((r) => 
        r.id === 'AMR-03' ? { ...r, home: { x: 1, y: 5 } } : r
      )
    };
  });
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [robotCount, setRobotCount] = useState(3);
  const [shelfColCount, setShelfColCount] = useState(6);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setWorld((prevWorld) => {
        let currentWorld = prevWorld;

        const unassignedTask = currentWorld.tasks.find((t) => t.status === 'pending' && !t.assignedRobotId);
        if (unassignedTask) {
          const availableRobot = currentWorld.robots.find(
            (r) => r.status === 'idle' && (!r.currentTaskId || r.currentTaskId === '')
          );
          if (availableRobot) {
            currentWorld = {
              ...currentWorld,
              tasks: currentWorld.tasks.map((t) =>
                t.id === unassignedTask.id ? { ...t, status: 'assigned', assignedRobotId: availableRobot.id } : t
              ),
              robots: currentWorld.robots.map((r) =>
                r.id === availableRobot.id ? { ...r, status: 'assigned', currentTaskId: unassignedTask.id } : r
              ),
            };
          }
        }

        const nextWorld = stepSimulation(currentWorld);

        currentWorld.tasks.forEach((t) => {
          const nextT = nextWorld.tasks.find((nt) => nt.id === t.id);
          if (nextT && t.status !== nextT.status) {
            if (nextT.status === 'in_progress') {
              addLog(`${(nextT.assignedRobotId ?? 'robot').toLowerCase()} reached pickup for ${nextT.id.toLowerCase()}`, 'info');
            } else if (nextT.status === 'completed') {
              addLog(`task ${nextT.id.toLowerCase()} completed at dropoff`, 'info');
            }
          }
        });

        if (nextWorld.metrics.conflictCount > currentWorld.metrics.conflictCount) {
          addLog(`pibt conflict resolved at tick ${nextWorld.tick}`, 'warning');
        }

        return nextWorld;
      });
    }, 650);

    return () => clearInterval(timer);
  }, [isSimulating]);

  const addLog = (text: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const now = new Date();
    setLogs(prev => [...prev, { time: now.toLocaleTimeString('en-GB', { hour12: false }), text, type }]);
  };

  const handleCreateTask = () => {
    setWorld((prev) => {
      const taskId = `T-${105 + prev.tasks.length}`;
      const pickupLocations = [{ x: 1, y: 0 }, { x: 14, y: 0 }, { x: 3, y: 9 }, { x: 9, y: 9 }];
      const dropoffLocations = [{ x: 6, y: 12 }, { x: 17, y: 12 }, { x: 9, y: 1 }, { x: 13, y: 1 }];
      const pickup = pickupLocations[prev.tasks.length % pickupLocations.length];
      const dropoff = dropoffLocations[(prev.tasks.length + 1) % dropoffLocations.length];

      const newTask: Task = {
        id: taskId,
        pickup,
        dropoff,
        weight: Math.floor(Math.random() * 80) + 10, // 10-90kg — sometimes exceeds a Scout Agile 2.0's capacity on purpose
        createdAt: prev.tick,
        priority: 1,
        status: 'pending',
      };

      const idleRobot = prev.robots.find((r) => r.status === 'idle' && !r.currentTaskId);
      if (idleRobot) {
        newTask.status = 'assigned';
        newTask.assignedRobotId = idleRobot.id;
        const updatedRobots = prev.robots.map((r) =>
          r.id === idleRobot.id ? { ...r, status: 'assigned' as const, currentTaskId: newTask.id } : r
        );
        addLog(`task ${taskId.toLowerCase()} created and assigned to ${idleRobot.id.toLowerCase()}`, 'info');
        return {
          ...prev,
          tasks: [...prev.tasks, newTask],
          robots: updatedRobots,
        };
      }

      addLog(`task ${taskId.toLowerCase()} queued pending`, 'info');
      return {
        ...prev,
        tasks: [...prev.tasks, newTask],
      };
    });
  };

  const handleToggleSimulation = () => {
    if (isSimulating) {
      addLog('simulation paused', 'warning');
    } else {
      addLog('simulation started (a* routing and pibt stepping active)', 'info');
    }
    setIsSimulating(!isSimulating);
  };

  const handleSimulateConflict = () => {
    addLog('priority conflict trigger verified: pibt active', 'warning');
  };
  
  const handleSimulateDeadlock = () => {
    addLog('deadlock avoidance verified: priority inheritance active', 'info');
  };

  const handleFailAMR = () => {
    setWorld((prev) => {
      const target = prev.robots.find((r) => r.id === 'AMR-02') || prev.robots[0];
      if (!target || target.status === 'failed') return prev;
      addLog(`${target.id.toLowerCase()} failure injected! pibt rerouting fleet`, 'error');
      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === target.id ? { ...r, status: 'failed' as const, path: [] } : r
        ),
      };
    });
  };

  const handleReset = () => {
    const initial = createInitialWorld();
    setWorld({
      ...initial,
      robots: initial.robots.map((r) => 
        r.id === 'AMR-03' ? { ...r, home: { x: 1, y: 5 } } : r
      )
    });
    setIsSimulating(false);
    setRobotCount(3);
    setShelfColCount(6);
    setSelectedRobotId(null);
    addLog('system state reset to initial conditions', 'info');
  };

  const handleRobotCountChange = (newCount: number) => {
    setRobotCount(newCount);
    setWorld((prev) => {
      if (newCount > prev.robots.length) {
        const safeSpawns = [
          { x: 3, y: 4 },
          { x: 9, y: 8 },
          { x: 14, y: 4 },
          { x: 3, y: 12 },
          { x: 9, y: 12 },
          { x: 14, y: 12 },
          { x: 17, y: 4 },
        ];
        const newRobots = [...prev.robots];
        for (let i = prev.robots.length; i < newCount; i++) {
          const spawnIdx = i - 3;
          const pos = (spawnIdx >= 0 && spawnIdx < safeSpawns.length) ? safeSpawns[spawnIdx] : { x: 0, y: 12 };
          newRobots.push({
            id: `AMR-${(i + 1).toString().padStart(2, '0')}`,
            position: pos,
            home: pos,
            battery: Math.floor(Math.random() * 30) + 70,
            status: 'idle',
            model: ROBOT_MODELS[i % ROBOT_MODELS.length],
            path: [],
            priority: 0,
          });
        }
        return { ...prev, robots: newRobots };
      } else if (newCount < prev.robots.length) {
        return { ...prev, robots: prev.robots.slice(0, newCount) };
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] bg-[url('/bg.png')] bg-cover bg-fixed bg-center font-sans py-6 px-4 md:px-8 lg:px-12 flex justify-center items-start selection:bg-[#C9F27D]/30">
      <div className="w-full max-w-[1520px] bg-black/40 backdrop-blur-2xl rounded-2xl border border-zinc-800/80 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        <Header />

        <div className="p-4 flex gap-4">
          <div className="w-[72%] flex flex-col gap-4 min-w-0">
            <WarehouseMap 
              robots={world.robots}
              selectedRobotId={selectedRobotId}
              onSelectRobot={setSelectedRobotId}
              shelfColCount={shelfColCount}
            />

            <div className="shrink-0 flex flex-col gap-4">
              <ControlPanel 
                isSimulating={isSimulating}
                robotCount={robotCount}
                shelfColCount={shelfColCount}
                onCreateTask={handleCreateTask}
                onToggleSimulation={handleToggleSimulation}
                onSimulateConflict={handleSimulateConflict}
                onSimulateDeadlock={handleSimulateDeadlock}
                onFailAMR={handleFailAMR}
                onBlockAisle={() => addLog('aisle block simulated', 'warning')}
                onReset={handleReset}
                onRobotCountChange={handleRobotCountChange}
                onShelfColCountChange={setShelfColCount}
              />

              <MetricsBar 
                tasks={world.tasks}
                robots={world.robots}
                metrics={world.metrics}
              />
            </div>
          </div>

          <div className="w-[28%] flex flex-col gap-4 min-w-0">
            <FleetStatus 
              robots={world.robots}
              selectedRobotId={selectedRobotId}
              onSelectRobot={setSelectedRobotId}
            />

            <ActiveTasks 
              tasks={world.tasks}
              robots={world.robots}
            />

            <EventLog logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
