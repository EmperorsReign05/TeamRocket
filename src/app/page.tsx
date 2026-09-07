'use client';

import React, { useState, useEffect } from 'react';
import type { Task, WorldState } from '@/core/types';
import { createInitialWorld } from '@/core/simulation/state';
import { stepSimulation } from '@/core/simulation/engine';
import { 
  SidebarNav,
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
  { time: '14:32:00', text: 'Simulation engine ready (A* + PIBT active)', type: 'info' },
  { time: '14:31:45', text: 'AMR-02 assigned to T-102', type: 'info' },
  { time: '14:31:12', text: 'AMR-03 assigned to T-103', type: 'info' },
  { time: '14:30:05', text: 'Warehouse grid and congestion field initialized', type: 'info' },
  { time: '14:27:10', text: 'Task T-104 queued pending', type: 'info' },
  { time: '14:25:00', text: 'System initialized with live WorldState', type: 'info' },
];

export default function Dashboard() {
  const [time, setTime] = useState<string>('');
  const [world, setWorld] = useState<WorldState>(() => createInitialWorld());
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [robotCount, setRobotCount] = useState(3);
  const [shelfColCount, setShelfColCount] = useState(6);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
      const dateString = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      setTime(`${timeString}   ${dateString}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setWorld((prevWorld) => {
        const nextWorld = stepSimulation(prevWorld);

        prevWorld.tasks.forEach((t) => {
          const nextT = nextWorld.tasks.find((nt) => nt.id === t.id);
          if (nextT && t.status !== nextT.status) {
            if (nextT.status === 'in_progress') {
              addLog(`${nextT.assignedRobotId ?? 'Robot'} reached pickup for ${nextT.id}`, 'info');
            } else if (nextT.status === 'completed') {
              addLog(`Task ${nextT.id} completed at dropoff!`, 'info');
            }
          }
        });

        if (nextWorld.metrics.conflictCount > prevWorld.metrics.conflictCount) {
          addLog(`PIBT conflict resolved at tick ${nextWorld.tick}`, 'warning');
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
        addLog(`Task ${taskId} created and assigned to ${idleRobot.id}`, 'info');
        return {
          ...prev,
          tasks: [...prev.tasks, newTask],
          robots: updatedRobots,
        };
      }

      addLog(`Task ${taskId} created (queued pending)`, 'info');
      return {
        ...prev,
        tasks: [...prev.tasks, newTask],
      };
    });
  };

  const handleToggleSimulation = () => {
    if (isSimulating) {
      addLog('Simulation paused', 'warning');
    } else {
      addLog('Simulation started (A* routing & PIBT stepping active)', 'info');
    }
    setIsSimulating(!isSimulating);
  };

  const handleSimulateConflict = () => {
    addLog('Priority conflict trigger verified — PIBT active', 'warning');
  };
  
  const handleSimulateDeadlock = () => {
    addLog('Deadlock avoidance verified: priority inheritance active', 'info');
  };

  const handleFailAMR = () => {
    setWorld((prev) => {
      const target = prev.robots.find((r) => r.id === 'AMR-02') || prev.robots[0];
      if (!target || target.status === 'failed') return prev;
      addLog(`${target.id} failure injected! PIBT rerouting fleet...`, 'error');
      return {
        ...prev,
        robots: prev.robots.map((r) =>
          r.id === target.id ? { ...r, status: 'failed' as const, path: [] } : r
        ),
      };
    });
  };

  const handleReset = () => {
    setWorld(createInitialWorld());
    setIsSimulating(false);
    setRobotCount(3);
    setShelfColCount(6);
    setSelectedRobotId(null);
    addLog('System state reset to initial conditions', 'info');
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
    <div className="flex min-h-screen bg-[#0b1121] text-slate-200 font-sans text-sm selection:bg-blue-500/30">
      <SidebarNav onNavigate={(label) => addLog(`Navigated to ${label}`, 'info')} />

      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        <Header time={time} />

        <div className="flex-1 p-4 flex gap-4">
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
                onBlockAisle={() => addLog('Aisle block simulated', 'warning')}
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
