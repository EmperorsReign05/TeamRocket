'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, ListTodo, Car, Map, BarChart3, Settings, 
  Plus, Play, AlertTriangle, XOctagon, AlertCircle, RefreshCw,
  BatteryFull, BatteryMedium, CheckCircle2, Clock, TrendingUp
} from 'lucide-react';
import { 
  WAREHOUSE_WIDTH, 
  WAREHOUSE_HEIGHT, 
  SHELF_BLOCKS, 
  WAITING_ZONES, 
  PICKUP_STATIONS, 
  DROPOFF_STATIONS, 
  INTERSECTIONS 
} from '@/core/map/warehouse';

// --- MOCK DATA & TYPES (Backend team will replace these) ---

type RobotStatus = {
  id: string;
  color: string;
  pos: { x: number; y: number };
  battery: number;
  status: string;
  heading?: 'up' | 'down' | 'left' | 'right';
  path?: { x: number; y: number }[];
};

type TaskStatus = {
  id: string;
  desc: string;
  robot: string;
  robotColor: string;
  status: 'In Progress' | 'Assigned' | 'Pending';
};

type LogEntry = {
  time: string;
  text: string;
  type: 'info' | 'warning' | 'error';
};

const INITIAL_ROBOTS: RobotStatus[] = [
  { 
    id: 'AMR-01', 
    color: '#3b82f6', 
    pos: { x: 1, y: 0 }, 
    battery: 87, 
    status: 'Docked (P1)',
    heading: 'down',
    path: [
      { x: 1, y: 0 }, 
      { x: 3, y: 0 }, 
      { x: 3, y: 4 }, 
      { x: 6, y: 4 }
    ]
  },
  { 
    id: 'AMR-02', 
    color: '#f59e0b', 
    pos: { x: 10, y: 4 }, 
    battery: 62, 
    status: 'En route to T-102',
    heading: 'left',
    path: [
      { x: 10, y: 4 }, 
      { x: 6, y: 4 }, 
      { x: 6, y: 8 }
    ]
  },
  { 
    id: 'AMR-03', 
    color: '#22c55e', 
    pos: { x: 6, y: 8 }, 
    battery: 91, 
    status: 'Waiting (W2)',
    heading: 'down',
    path: [
      { x: 6, y: 8 }, 
      { x: 6, y: 12 }
    ]
  },
];

const GHOST_PATHS = [
  {
    robotId: 'AMR-02',
    color: '#ef4444',
    reason: 'Congestion avoidance',
    path: [
      { x: 10, y: 4 },
      { x: 14, y: 4 },
      { x: 14, y: 8 }
    ],
    conflictPoint: { x: 14, y: 8 }
  }
];

const INITIAL_TASKS: TaskStatus[] = [
  { id: 'T-102', desc: 'Shelf A3 → B7', robot: 'AMR-02', robotColor: '#f59e0b', status: 'In Progress' },
  { id: 'T-103', desc: 'Shelf C1 → D2', robot: 'AMR-03', robotColor: '#22c55e', status: 'Assigned' },
  { id: 'T-104', desc: 'Shelf B6 → A1', robot: 'Unassigned', robotColor: '#64748b', status: 'Pending' },
];

const INITIAL_LOGS: LogEntry[] = [
  { time: '14:32:00', text: 'AMR-01 docked at P1', type: 'info' },
  { time: '14:31:45', text: 'AMR-02 reserved i05 (t=12-14s)', type: 'info' },
  { time: '14:31:12', text: 'AMR-03 waiting at W2 (aisle busy)', type: 'warning' },
  { time: '14:30:05', text: 'Task T-102 assigned to AMR-02', type: 'info' },
  { time: '14:29:50', text: 'AMR-03 reached waiting zone W2', type: 'info' },
  { time: '14:28:30', text: 'Path planned for AMR-03', type: 'info' },
  { time: '14:27:10', text: 'Task T-103 created', type: 'info' },
  { time: '14:26:05', text: 'AMR-02 passed intersection i08', type: 'info' },
  { time: '14:25:00', text: 'System initialized', type: 'info' },
];

// -----------------------------------------------------------


export default function Dashboard() {
  const [time, setTime] = useState<string>('');
  
  // State for components to show they are functional
  const [robots, setRobots] = useState<RobotStatus[]>(INITIAL_ROBOTS);
  const [tasks, setTasks] = useState<TaskStatus[]>(INITIAL_TASKS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [stats, setStats] = useState({ total: 12, completed: 9, collisions: 0 });
  const [robotCount, setRobotCount] = useState(3);
  const [shelfColCount, setShelfColCount] = useState(6);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  // Update time dynamically
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

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Action Handlers
  const addLog = (text: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const now = new Date();
    setLogs(prev => [...prev, { time: now.toLocaleTimeString('en-GB', { hour12: false }), text, type }]);
  };

  const handleCreateTask = () => {
    addLog('Manual task created from UI', 'info');
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
  };

  const handleToggleSimulation = () => {
    if (isSimulating) {
      addLog('Simulation paused', 'warning');
    } else {
      addLog('Simulation started', 'info');
    }
    setIsSimulating(!isSimulating);
  };

  const handleSimulateConflict = () => {
    addLog('Simulated conflict triggered at i05', 'error');
    setStats(prev => ({ ...prev, collisions: prev.collisions + 1 }));
  };
  
  const handleSimulateDeadlock = () => {
    addLog('Deadlock detected between AMR-02 and AMR-03', 'error');
  };

  const handleFailAMR = () => {
    addLog('AMR-02 failure simulated. Route replanning...', 'error');
    setRobots(prev => prev.map(r => r.id === 'AMR-02' ? { ...r, status: 'ERROR', color: '#ef4444' } : r));
  };

  const handleReset = () => {
    setRobots(INITIAL_ROBOTS);
    setTasks(INITIAL_TASKS);
    setStats({ total: 12, completed: 9, collisions: 0 });
    setIsSimulating(false);
    setRobotCount(3);
    setShelfColCount(6);
    setSelectedRobotId(null);
    addLog('System state reset to initial conditions', 'info');
  };

  const handleRobotCountChange = (newCount: number) => {
    setRobotCount(newCount);
    setRobots(prev => {
      if (newCount > prev.length) {
        const newRobots = [...prev];
        const safeSpawns = [
          {x: 3, y: 4},   // between Col 1 & 2, corridor y=4
          {x: 9, y: 8},   // between Col 3 & 4, corridor y=8
          {x: 14, y: 4},  // between Col 4 & 5, corridor y=4
          {x: 3, y: 12},  // bottom corridor
          {x: 9, y: 12},  // bottom corridor
          {x: 14, y: 12}, // bottom corridor
          {x: 17, y: 4}   // between Col 5 & 6, corridor y=4
        ];
        
        for (let i = prev.length; i < newCount; i++) {
          const spawnIdx = i - 3; // 3 initial robots
          const pos = (spawnIdx >= 0 && spawnIdx < safeSpawns.length) ? safeSpawns[spawnIdx] : { x: 0, y: 12 };
          
          newRobots.push({
            id: `AMR-${(i + 1).toString().padStart(2, '0')}`,
            color: ['#a855f7', '#ec4899', '#06b6d4', '#eab308', '#6366f1'][i % 5],
            pos: pos,
            battery: Math.floor(Math.random() * 40) + 60,
            status: 'Idle'
          });
        }
        return newRobots;
      } else if (newCount < prev.length) {
        return prev.slice(0, newCount);
      }
      return prev;
    });
  };

  const shelfCols = useMemo(() => {
    return Array.from(new Set(SHELF_BLOCKS.map(b => b[0]))).sort((a, b) => a - b);
  }, []);

  const displayedShelfBlocks = useMemo(() => {
    return SHELF_BLOCKS.filter(b => {
      const colIndex = shelfCols.indexOf(b[0]);
      return colIndex !== -1 && colIndex < shelfColCount;
    });
  }, [shelfColCount, shelfCols]);

  const renderShelf = (x: number, y: number, w: number, h: number) => {
    return (
      <div 
        key={`shelf-${x}-${y}`} 
        className="absolute bg-[#0f172a] border border-[#1e293b] p-[2px] rounded-sm shadow-md"
        style={{ 
          left: `calc(100% * ${x}/${WAREHOUSE_WIDTH})`, 
          top: `calc(100% * ${y}/${WAREHOUSE_HEIGHT})`, 
          width: `calc(100% * ${w}/${WAREHOUSE_WIDTH})`, 
          height: `calc(100% * ${h}/${WAREHOUSE_HEIGHT})`,
          display: 'grid',
          gridTemplateColumns: `repeat(${w}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${h}, minmax(0, 1fr))`,
          gap: '2px'
        }}
      >
        {/* Render individual racks inside the shelf block */}
        {Array.from({ length: w * h }).map((_, i) => (
          <div key={i} className="bg-[#334155] border border-[#475569] rounded-[1px] shadow-inner"></div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0b1121] text-slate-200 font-sans text-sm selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <div className="w-[72px] bg-[#0b1121] border-r border-[#1e293b] flex flex-col items-center py-6 gap-8 shrink-0 z-20 sticky top-0 h-screen">
        <div className="w-10 h-10 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg border border-[#334155]">
          <span className="opacity-80">R</span>
        </div>
        <nav className="flex flex-col gap-2 w-full">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: ListTodo, label: 'Tasks' },
            { icon: Car, label: 'Fleet' },
            { icon: Map, label: 'Map' },
            { icon: BarChart3, label: 'Analytics' },
            { icon: Settings, label: 'Settings' }
          ].map((item, i) => (
            <div key={i} onClick={() => addLog(`Navigated to ${item.label}`, 'info')} className={`flex flex-col items-center gap-1.5 cursor-pointer w-full py-3 transition-colors ${item.active ? 'text-blue-500 bg-blue-500/10 border-l-2 border-blue-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border-l-2 border-transparent'}`}>
              <item.icon size={20} strokeWidth={item.active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        
        {/* Header */}
        <header className="h-[72px] border-b border-[#1e293b] flex items-center justify-between px-6 shrink-0 bg-[#0b1121] sticky top-0 z-10">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-semibold text-white tracking-wide">AMR Fleet Control Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">Distributed • Edge-AI Powered • Collision-Free • Scalable</p>
          </div>
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-slate-400 font-medium">System Status</span>
              <div className="flex items-center gap-2 text-[#22c55e] text-xs font-semibold tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                All Systems Operational
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono flex flex-col items-end gap-1">
              <span className="text-[11px] font-sans font-medium text-slate-400 tracking-wide">Time & Date</span>
              <span className="text-slate-300 tracking-wider font-mono">{time || '...'}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Layout */}
        <div className="flex-1 p-4 flex gap-4">
          
          {/* Left Column (70%) */}
          <div className="w-[72%] flex flex-col gap-4 min-w-0">
            
            {/* Map Container */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col overflow-hidden shadow-lg relative min-h-[550px]">
              
              {/* Map Header */}
              <div className="h-12 border-b border-[#1e293b] flex justify-between items-center px-5 bg-[#0b1121]/60 shrink-0 z-10">
                <h2 className="font-semibold text-slate-200 text-sm tracking-wide">Warehouse Layout (2D)</h2>
                <div className="flex gap-4 text-[11px] text-slate-400 font-medium tracking-wide">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#334155] rounded-sm"></div> Shelf</div>
                  <div className="flex items-center gap-2"><div className="w-4 border-t border-slate-500 border-dashed"></div> Nav Path</div>
                  <div className="flex items-center gap-2"><div className="w-4 border-t border-[#ef4444] opacity-50 border-dotted"></div> Ghost Path</div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 border border-slate-500 flex items-center justify-center relative"><div className="w-[1px] h-3 bg-slate-500 rotate-45 absolute"></div><div className="w-[1px] h-3 bg-slate-500 -rotate-45 absolute"></div></div> 
                     Intersection
                  </div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#22c55e] rounded-sm"></div> Pickup</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ef4444] rounded-sm"></div> Drop</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 border border-blue-500 border-dashed rounded-sm"></div> Waiting Zone</div>
                </div>
              </div>
              
              {/* Actual Map Grid */}
              <div className="flex-1 bg-[#0f172a] p-4 flex items-center justify-center overflow-hidden">
                 <div className="warehouse-map w-full h-full relative" style={{ 
                     display: 'grid', 
                     gridTemplateColumns: `repeat(${WAREHOUSE_WIDTH}, minmax(0, 1fr))`, 
                     gridTemplateRows: `repeat(${WAREHOUSE_HEIGHT}, minmax(0, 1fr))`,
                     gap: '1px'
                 }}>
                    {/* Grid Background Lines */}
                    {Array.from({ length: WAREHOUSE_WIDTH * WAREHOUSE_HEIGHT }).map((_, i) => (
                        <div key={i} className="border border-[#1e293b]/50"></div>
                    ))}

                    {/* Coordinate Labels */}
                    {Array.from({ length: WAREHOUSE_WIDTH }).map((_, i) => (
                        <div key={`col-${i}`} className="absolute top-[-20px] text-[10px] text-slate-500 font-mono" style={{ left: `calc((100%/${WAREHOUSE_WIDTH}) * ${i} + (100%/(${WAREHOUSE_WIDTH} * 2)) - 4px)` }}>{i}</div>
                    ))}
                    {Array.from({ length: WAREHOUSE_HEIGHT }).map((_, i) => (
                        <div key={`row-${i}`} className="absolute left-[-20px] text-[10px] text-slate-500 font-mono" style={{ top: `calc((100%/${WAREHOUSE_HEIGHT}) * ${i} + (100%/(${WAREHOUSE_HEIGHT} * 2)) - 6px)` }}>{i}</div>
                    ))}

                    {displayedShelfBlocks.map(block => renderShelf(block[0], block[1], block[2], block[3]))}

                    {INTERSECTIONS.map((pos, idx) => (
                      <div 
                        key={`intersection-${idx}`} 
                        className="absolute border border-slate-600/70 flex items-center justify-center" 
                        style={{ 
                          left: `calc(100% * ${pos.x}/${WAREHOUSE_WIDTH})`, 
                          top: `calc(100% * ${pos.y}/${WAREHOUSE_HEIGHT})`, 
                          width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                          height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                        }}
                      >
                        <div className="w-[1px] h-full bg-slate-600/60 rotate-45 absolute"></div>
                        <div className="w-[1px] h-full bg-slate-600/60 -rotate-45 absolute"></div>
                      </div>
                    ))}

                    {WAITING_ZONES.map((zone) => (
                      <div 
                        key={zone.id} 
                        className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 flex items-center justify-center rounded-sm" 
                        style={{ 
                          left: `calc(100% * ${zone.x}/${WAREHOUSE_WIDTH})`, 
                          top: `calc(100% * ${zone.y}/${WAREHOUSE_HEIGHT})`, 
                          width: `calc(100% * ${zone.width}/${WAREHOUSE_WIDTH})`, 
                          height: `calc(100% * ${zone.height}/${WAREHOUSE_HEIGHT})` 
                        }}
                      >
                         <span className="text-[10px] text-blue-300 font-bold text-center leading-tight">Waiting Zone<br/>{zone.id}</span>
                      </div>
                    ))}

                    {PICKUP_STATIONS.map((station) => (
                      <div 
                        key={station.id} 
                        className="absolute border-2 border-[#22c55e] bg-[#22c55e]/20 flex items-center justify-center rounded-sm" 
                        style={{ 
                          left: `calc(100% * ${station.position.x}/${WAREHOUSE_WIDTH})`, 
                          top: `calc(100% * ${station.position.y}/${WAREHOUSE_HEIGHT})`, 
                          width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                          height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                        }}
                      >
                         <span className="text-[11px] text-[#22c55e] font-bold">{station.id}</span>
                      </div>
                    ))}

                    {DROPOFF_STATIONS.map((station) => (
                      <div 
                        key={station.id} 
                        className="absolute border-2 border-[#ef4444] bg-[#ef4444]/20 flex items-center justify-center rounded-sm" 
                        style={{ 
                          left: `calc(100% * ${station.position.x}/${WAREHOUSE_WIDTH})`, 
                          top: `calc(100% * ${station.position.y}/${WAREHOUSE_HEIGHT})`, 
                          width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                          height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                        }}
                      >
                         <span className="text-[11px] text-[#ef4444] font-bold">{station.id}</span>
                      </div>
                    ))}

                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      viewBox={`0 0 ${WAREHOUSE_WIDTH} ${WAREHOUSE_HEIGHT}`}
                      preserveAspectRatio="none"
                    >
                      {GHOST_PATHS.map((ghost, idx) => (
                        <polyline
                          key={`ghost-path-${idx}`}
                          points={ghost.path.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ')}
                          fill="none"
                          stroke={ghost.color}
                          strokeWidth="0.07"
                          strokeDasharray="0.12 0.12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.55}
                        />
                      ))}

                      {robots.map((robot) => {
                        if (!robot.path || robot.path.length < 2) return null;
                        const isSelected = selectedRobotId === robot.id;
                        const pointsStr = robot.path.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ');

                        return (
                          <g key={`path-${robot.id}`}>
                            {isSelected && (
                              <polyline
                                points={pointsStr}
                                fill="none"
                                stroke={robot.color}
                                strokeWidth="0.22"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.3}
                              />
                            )}
                            <polyline
                              points={pointsStr}
                              fill="none"
                              stroke={robot.color}
                              strokeWidth={isSelected ? "0.12" : "0.08"}
                              strokeDasharray="0.2 0.15"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity={selectedRobotId ? (isSelected ? 1.0 : 0.25) : 0.8}
                              className="transition-all duration-300"
                            />
                            {robot.path.map((pt, pIdx) => (
                              <circle
                                key={`pt-${robot.id}-${pIdx}`}
                                cx={pt.x + 0.5}
                                cy={pt.y + 0.5}
                                r={pIdx === robot.path!.length - 1 ? 0.12 : 0.05}
                                fill={pIdx === robot.path!.length - 1 ? robot.color : '#ffffff'}
                                opacity={selectedRobotId ? (isSelected ? 0.9 : 0.2) : 0.6}
                              />
                            ))}
                          </g>
                        );
                      })}
                    </svg>

                    {GHOST_PATHS.map((ghost, idx) => (
                      <div 
                        key={`ghost-marker-${idx}`}
                        className="absolute flex items-center justify-center opacity-70 z-20" 
                        style={{ 
                          left: `calc(100% * (${ghost.conflictPoint.x} + 0.5)/${WAREHOUSE_WIDTH})`, 
                          top: `calc(100% * (${ghost.conflictPoint.y} + 0.5)/${WAREHOUSE_HEIGHT})`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        title={`Alternative path rejected: ${ghost.reason}`}
                      >
                        <XOctagon size={13} className="text-[#ef4444]" />
                      </div>
                    ))}

                    {robots.map((robot) => {
                      const isSelected = selectedRobotId === robot.id;
                      return (
                        <div 
                          key={robot.id}
                          onClick={() => setSelectedRobotId(isSelected ? null : robot.id)}
                          className={`absolute flex flex-col items-center justify-center transition-all duration-500 ease-in-out cursor-pointer z-30 group ${isSelected ? 'scale-110' : 'hover:scale-105'}`} 
                          style={{ 
                            left: `calc(100% * ${robot.pos.x}/${WAREHOUSE_WIDTH})`, 
                            top: `calc(100% * ${robot.pos.y}/${WAREHOUSE_HEIGHT})`, 
                            width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                            height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                          }}
                          title={`${robot.id} | Status: ${robot.status} | Battery: ${robot.battery}%`}
                        >
                           {isSelected && (
                             <div className="absolute inset-[-4px] rounded-full border-2 border-white/80 animate-pulse pointer-events-none"></div>
                           )}

                           <div 
                             className={`w-[54%] h-[54%] rounded-full relative z-20 flex items-center justify-center transition-all ${robot.status === 'ERROR' ? 'animate-ping' : ''}`} 
                             style={{ backgroundColor: robot.color, boxShadow: `0 0 12px ${robot.color}` }}
                           >
                             <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                           </div>

                           {robot.heading && (
                             <div 
                               className="absolute pointer-events-none text-white/80 transition-transform duration-300"
                               style={{ 
                                 transform: robot.heading === 'up' ? 'translateY(-14px) rotate(0deg)' : 
                                            robot.heading === 'down' ? 'translateY(14px) rotate(180deg)' : 
                                            robot.heading === 'left' ? 'translateX(-14px) rotate(-90deg)' : 
                                            'translateX(14px) rotate(90deg)' 
                               }}
                             >
                               <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px]" style={{ borderBottomColor: robot.color }} />
                             </div>
                           )}

                           <span className={`text-[9px] text-white mt-1 font-bold absolute top-full whitespace-nowrap transition-colors ${isSelected ? 'text-blue-300 underline font-extrabold' : 'opacity-90'}`}>
                             {robot.id}
                           </span>
                        </div>
                      );
                    })}

                 </div>
              </div>
            </div>

            {/* Bottom Panel (Fixed Height) */}
            <div className="h-[145px] shrink-0 flex gap-4">
                
                {/* Control Panel */}
                <div className="flex-1 bg-[#131c31] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between shadow-lg">
                  <h3 className="font-semibold text-slate-200 text-[13px] tracking-wide mb-3">Control Panel</h3>
                  <div className="flex flex-wrap gap-2.5">
                    <button onClick={handleCreateTask} className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0">
                      <Plus size={14} strokeWidth={2.5} /> Create Task
                    </button>
                    <button onClick={handleToggleSimulation} className={`hover:brightness-110 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${isSimulating ? 'bg-amber-500 shadow-amber-500/20' : 'bg-[#22c55e] shadow-green-500/20'}`}>
                      <Play size={14} strokeWidth={2.5} /> {isSimulating ? 'Pause Sim' : 'Start Sim'}
                    </button>
                    <button onClick={handleSimulateConflict} className="bg-[#f59e0b] hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 active:translate-y-0">
                      <AlertTriangle size={14} strokeWidth={2.5} /> Sim Conflict
                    </button>
                    <button onClick={handleSimulateDeadlock} className="bg-[#ef4444] hover:bg-red-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-red-500/20 hover:-translate-y-0.5 active:translate-y-0">
                      <XOctagon size={14} strokeWidth={2.5} /> Sim Deadlock
                    </button>
                    <button onClick={handleFailAMR} className="bg-[#475569] hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors hover:-translate-y-0.5 active:translate-y-0">
                      <AlertCircle size={14} strokeWidth={2.5} /> Fail AMR-02
                    </button>
                    <button onClick={() => addLog('Aisle block simulated', 'warning')} className="bg-[#8b5cf6] hover:bg-purple-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0">
                      <XOctagon size={14} strokeWidth={2.5} /> Block Aisle
                    </button>
                    <div className="flex-1"></div>
                    <button onClick={handleReset} className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors hover:-translate-y-0.5 active:translate-y-0">
                      <RefreshCw size={14} strokeWidth={2.5} /> Reset
                    </button>
                  </div>

                  {/* Environment Sliders */}
                  <div className="mt-3 pt-3 border-t border-[#1e293b] flex gap-6">
                    <div className="flex-1 flex items-center gap-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-20">Robots ({robotCount})</label>
                      <input type="range" min="1" max="10" value={robotCount} onChange={e => handleRobotCountChange(parseInt(e.target.value))} className="w-full h-1 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400" />
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-20">Shelves ({shelfColCount})</label>
                      <input type="range" min="0" max="6" value={shelfColCount} onChange={e => setShelfColCount(parseInt(e.target.value))} className="w-full h-1 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#22c55e] hover:accent-[#4ade80]" />
                    </div>
                  </div>
                </div>

                {/* Mini Metrics */}
                <div className="w-[480px] bg-[#131c31] rounded-xl border border-[#1e293b] flex shadow-lg divide-x divide-[#1e293b]">
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
                      <div className="flex items-center justify-between text-slate-400">
                         <span className="text-[10px] font-semibold uppercase tracking-wider">Total Tasks</span>
                         <ListTodo size={14} />
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
                   </div>
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
                      <div className="flex items-center justify-between text-[#22c55e]">
                         <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Completed</span>
                         <div className="w-5 h-5 rounded-full bg-[#22c55e]/20 flex items-center justify-center"><CheckCircle2 size={12} strokeWidth={3} /></div>
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">{stats.completed}</div>
                   </div>
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
                      <div className="flex items-center justify-between text-[#ef4444]">
                         <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Collisions</span>
                         <div className="w-5 h-5 rounded-full bg-[#ef4444]/20 flex items-center justify-center"><AlertTriangle size={12} strokeWidth={3} /></div>
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">{stats.collisions}</div>
                   </div>
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-[#3b82f6]">
                         <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg Time</span>
                         <div className="w-5 h-5 rounded-full bg-[#3b82f6]/20 flex items-center justify-center"><Clock size={12} strokeWidth={3} /></div>
                      </div>
                      <div className="text-xl font-bold text-white mt-1">36.2s</div>
                   </div>
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-[#8b5cf6]">
                         <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fleet Util</span>
                         <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center"><TrendingUp size={12} strokeWidth={3} /></div>
                      </div>
                      <div className="text-xl font-bold text-white mt-1">78%</div>
                   </div>
                </div>

            </div>
          </div>

          {/* Right Column (28%) */}
          <div className="w-[28%] flex flex-col gap-4 min-w-0">
            
            {/* Fleet Status */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shrink-0 shadow-lg">
              <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40">
                <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Fleet Status</h3>
                <span className="text-[11px] text-[#22c55e] font-semibold tracking-wide uppercase">{robots.filter(r=>r.status !== 'ERROR').length} / {robots.length} Online</span>
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                
                {robots.map(r => {
                  const isSelected = selectedRobotId === r.id;
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => setSelectedRobotId(isSelected ? null : r.id)}
                      className={`px-3 py-2 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-500/15 border border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                          : 'hover:bg-slate-800/30 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3.5 h-3.5 rounded-full shadow-lg relative" style={{ backgroundColor: r.color, boxShadow: `0 0 10px ${r.color}` }}>
                          {isSelected && <span className="absolute -inset-1 rounded-full border border-white animate-ping opacity-60"></span>}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-200 tracking-wide flex items-center gap-2">
                            {r.id}
                            {isSelected && <span className="text-[9px] bg-blue-500/30 text-blue-300 font-bold px-1.5 py-0.5 rounded uppercase">Selected</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">{r.status}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-slate-200 font-mono font-medium">
                        {r.battery}%
                        {r.battery > 80 ? <BatteryFull size={22} className="text-[#22c55e]" strokeWidth={1.5} /> : <BatteryMedium size={22} className="text-[#f59e0b]" strokeWidth={1.5} />}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shrink-0 shadow-lg">
              <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40">
                <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Active Tasks</h3>
                <span className="text-[11px] text-[#22c55e] font-semibold tracking-wide uppercase">{tasks.filter(t => t.status !== 'Pending').length} Active</span>
              </div>
              <div className="p-2 flex flex-col">
                
                {tasks.map(t => (
                  <div key={t.id} className={`px-4 py-3 border-b border-[#1e293b]/50 flex justify-between items-center ${t.status === 'Pending' ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm text-slate-200 tracking-wide">{t.id}</span>
                          <span className="text-[11px] text-slate-400">{t.desc}</span>
                      </div>
                      <div className="text-[11px] font-bold tracking-wider" style={{ color: t.robotColor }}>{t.robot}</div>
                    </div>
                    
                    {t.status === 'In Progress' && <span className="bg-[#1e3a8a]/40 text-[#60a5fa] border border-[#1e3a8a] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">In Progress</span>}
                    {t.status === 'Assigned' && <span className="bg-[#14532d]/40 text-[#4ade80] border border-[#14532d] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">Assigned</span>}
                    {t.status === 'Pending' && <span className="bg-[#1e293b]/60 text-slate-400 border border-[#334155] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">Pending</span>}
                  </div>
                ))}

              </div>
            </div>

            {/* Event Log */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shadow-lg max-h-[500px]">
              <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40 shrink-0">
                <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Event Log</h3>
                <span className="flex items-center gap-2 text-[10px] text-[#22c55e] font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e] animate-pulse"></span>
                  Live
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 text-[12px] font-medium tracking-wide">
                {[...logs].reverse().map((log, idx) => (
                  <div key={idx} className="flex gap-4 items-start opacity-80 hover:opacity-100 transition-opacity pb-2">
                    <span className="text-slate-500 font-mono text-[11px] shrink-0 pt-0.5">{log.time}</span>
                    <span className={`${log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                      {log.text}
                    </span>
                  </div>
                ))}
                {/* Invisible element to auto-scroll to bottom if not reversed, but we reversed it so newest is on top */}
                <div ref={logEndRef} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
