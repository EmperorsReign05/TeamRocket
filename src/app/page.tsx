'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ListTodo, Car, Map, BarChart3, Settings, 
  Plus, Play, AlertTriangle, XOctagon, AlertCircle, RefreshCw,
  Battery, BatteryFull, BatteryMedium, BatteryLow, CheckCircle2,
  Clock, TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const [time, setTime] = useState<string>('');
  
  // Mock Robot State
  const [robots, setRobots] = useState([
    { id: 'AMR-01', color: '#3b82f6', pos: { x: 1, y: 1 }, target: { x: 1, y: 4 }, battery: 87, status: 'Docked (P1)' },
    { id: 'AMR-02', color: '#f59e0b', pos: { x: 8, y: 3 }, target: { x: 3, y: 6 }, battery: 62, status: 'En route to T-102' },
    { id: 'AMR-03', color: '#22c55e', pos: { x: 6, y: 6 }, target: { x: 6, y: 12 }, battery: 91, status: 'Waiting (W2)' },
  ]);

  // Mock Logs
  const [logs, setLogs] = useState([
    { time: '14:32', text: 'AMR-01 docked at P1', type: 'info' },
    { time: '14:31', text: 'AMR-02 reserved i05 (t=12-14s)', type: 'info' },
    { time: '14:31', text: 'AMR-03 waiting at W2 (aisle busy)', type: 'warning' },
    { time: '14:30', text: 'Task T-102 assigned to AMR-02', type: 'info' },
    { time: '14:29', text: 'AMR-03 reached waiting zone W2', type: 'info' },
  ]);

  // Animation Loop Mock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }) + ' - ' + now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Simple mock animation for robots
    const animTimer = setInterval(() => {
      setRobots(prev => prev.map(r => {
        const newPos = { ...r.pos };
        if (newPos.x < r.target.x) newPos.x += 1;
        else if (newPos.x > r.target.x) newPos.x -= 1;
        else if (newPos.y < r.target.y) newPos.y += 1;
        else if (newPos.y > r.target.y) newPos.y -= 1;
        
        // Randomly assign new target if reached
        let newTarget = { ...r.target };
        if (newPos.x === r.target.x && newPos.y === r.target.y) {
            newTarget = { 
                x: Math.floor(Math.random() * 15) + 1, 
                y: Math.floor(Math.random() * 10) + 1 
            };
        }
        return { ...r, pos: newPos, target: newTarget };
      }));
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(animTimer);
    };
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-8">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-900/20">
          Z
        </div>
        <nav className="flex flex-col gap-6 w-full">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: ListTodo, label: 'Tasks' },
            { icon: Car, label: 'Fleet' },
            { icon: Map, label: 'Map' },
            { icon: BarChart3, label: 'Analytics' },
            { icon: Settings, label: 'Settings' }
          ].map((item, i) => (
            <div key={i} className={`flex flex-col items-center gap-1 cursor-pointer w-full py-2 ${item.active ? 'text-blue-500 border-r-4 border-blue-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>
              <item.icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">AMR Fleet Control Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Distributed • Edge-AI Powered • Collision-Free • Scalable</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">System Status</span>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                All Systems Operational
              </div>
            </div>
            <div className="text-right text-sm text-slate-300 font-mono bg-slate-900 py-1.5 px-4 rounded-lg border border-slate-800">
              {time}
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
          
          {/* Left Column - Map & Controls */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            
            {/* Map Container */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h2 className="font-semibold text-slate-200">Warehouse Layout (2D)</h2>
                <div className="flex gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-700"></div> Shelf</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-500 border-dashed"></div> Path</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500"></div> Pickup</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500"></div> Drop</div>
                </div>
              </div>
              
              <div className="flex-1 p-6 flex items-center justify-center bg-slate-950 overflow-auto">
                <div className="warehouse-grid w-full max-w-4xl aspect-[20/13]">
                  {/* Grid Cells (20x13 = 260 cells) */}
                  {Array.from({ length: 260 }).map((_, i) => {
                    const x = i % 20;
                    const y = Math.floor(i / 20);
                    // Mock Shelves
                    const isShelf = (y >= 1 && y <= 3 && x >= 1 && x <= 2) || 
                                    (y >= 5 && y <= 7 && x >= 1 && x <= 2) ||
                                    (y >= 9 && y <= 11 && x >= 1 && x <= 2) ||
                                    (y >= 1 && y <= 3 && x >= 15 && x <= 16) ||
                                    (y >= 5 && y <= 7 && x >= 15 && x <= 16) ||
                                    (y >= 9 && y <= 11 && x >= 15 && x <= 16);
                    return (
                      <div key={i} className={`grid-cell ${isShelf ? 'grid-cell-shelf' : ''}`}>
                        {/* Mock Pickup / Dropoff stations */}
                        {x === 1 && y === 0 && <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-300 z-0">P1</div>}
                        {x === 13 && y === 0 && <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-300 z-0">P2</div>}
                        {x === 6 && y === 12 && <div className="absolute inset-0 bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-xs font-bold text-red-300 z-0">D1</div>}
                        {x === 18 && y === 12 && <div className="absolute inset-0 bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-xs font-bold text-red-300 z-0">D2</div>}
                        
                        {/* Intersection markers */}
                        {((x === 3 || x === 6 || x === 13) && (y === 4 || y === 8)) && (
                            <div className="absolute inset-0 grid-cell-intersection opacity-50 z-0"></div>
                        )}
                      </div>
                    );
                  })}

                  {/* Render Robots */}
                  {robots.map((robot, idx) => (
                    <div 
                      key={robot.id}
                      className="robot flex items-center justify-center font-bold text-[10px]"
                      style={{ 
                        backgroundColor: robot.color,
                        color: '#fff',
                        left: `calc(${(robot.pos.x / 20) * 100}% + 2px)`,
                        top: `calc(${(robot.pos.y / 13) * 100}% + 2px)`,
                        width: 'calc((100% / 20) - 4px)',
                        height: 'calc((100% / 13) - 4px)',
                      }}
                    >
                      {/* Optional label */}
                    </div>
                  ))}
                  
                  {/* Ghost Path (Mock) */}
                  <div className="ghost-path" style={{ color: robots[1].color, left: 'calc((8/20)*100%)', top: 'calc((3/13)*100%)', width: 'calc((2/20)*100%)', height: '0', borderBottomWidth: '2px', borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }}></div>
                  <div className="ghost-path" style={{ color: robots[1].color, left: 'calc((6/20)*100%)', top: 'calc((3/13)*100%)', height: 'calc((3/13)*100%)', width: '0', borderLeftWidth: '2px', borderTopWidth: 0, borderBottomWidth: 0, borderRightWidth: 0 }}></div>
                  
                </div>
              </div>
            </div>

            {/* Bottom Controls & Metrics */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col gap-5 shrink-0">
              <h3 className="font-semibold text-slate-200">Control Panel</h3>
              
              <div className="flex flex-wrap gap-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Plus size={16} /> Create Task
                </button>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Play size={16} /> Start Simulation
                </button>
                <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <AlertTriangle size={16} /> Simulate Conflict
                </button>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <XOctagon size={16} /> Simulate Deadlock
                </button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <AlertCircle size={16} /> Fail AMR-02
                </button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <XOctagon size={16} /> Block Aisle
                </button>
                <div className="flex-1"></div>
                <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <RefreshCw size={16} /> Reset
                </button>
              </div>

              {/* Mini Metrics Row */}
              <div className="grid grid-cols-5 gap-4 pt-4 border-t border-slate-800/50">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Total Tasks</p>
                    <p className="text-2xl font-bold text-white">12</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <ListTodo size={20} />
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Completed</p>
                    <p className="text-2xl font-bold text-white">9</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Collisions</p>
                    <p className="text-2xl font-bold text-white">0</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Avg Task Time</p>
                    <p className="text-2xl font-bold text-white">36.2s</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Fleet Util</p>
                    <p className="text-2xl font-bold text-white">78%</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column - Status & Logs */}
          <div className="w-[340px] flex flex-col gap-6 shrink-0">
            
            {/* Fleet Status */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200">Fleet Status</h3>
                <span className="text-xs text-emerald-400 font-medium">3 / 3 Online</span>
              </div>
              <div className="p-2">
                {robots.map(r => (
                  <div key={r.id} className="p-3 hover:bg-slate-800/50 rounded-lg flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: r.color, backgroundColor: r.color }}></div>
                      <div>
                        <div className="font-medium text-sm text-slate-200">{r.id}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{r.status}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                      {r.battery}%
                      {r.battery > 80 ? <BatteryFull size={18} className="text-emerald-400" /> : 
                       r.battery > 40 ? <BatteryMedium size={18} className="text-amber-400" /> : 
                       <BatteryLow size={18} className="text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200">Active Tasks</h3>
                <span className="text-xs text-emerald-400 font-medium">2 Active</span>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <div className="p-3 border-b border-slate-800/50 flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm text-slate-200">T-102</div>
                    <div className="text-xs text-slate-400 mt-1">Shelf A3 → B7</div>
                    <div className="text-xs text-amber-400 mt-1 font-medium">AMR-02</div>
                  </div>
                  <span className="bg-blue-900/40 text-blue-400 border border-blue-800 text-[10px] uppercase font-bold px-2 py-1 rounded-full">In Progress</span>
                </div>
                <div className="p-3 border-b border-slate-800/50 flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm text-slate-200">T-103</div>
                    <div className="text-xs text-slate-400 mt-1">Shelf C1 → D2</div>
                    <div className="text-xs text-emerald-400 mt-1 font-medium">AMR-03</div>
                  </div>
                  <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 text-[10px] uppercase font-bold px-2 py-1 rounded-full">Assigned</span>
                </div>
                <div className="p-3 flex justify-between items-start opacity-50">
                  <div>
                    <div className="font-medium text-sm text-slate-200">T-104</div>
                    <div className="text-xs text-slate-400 mt-1">Shelf B6 → A1</div>
                    <div className="text-xs text-slate-500 mt-1">Unassigned</div>
                  </div>
                  <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full">Pending</span>
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h3 className="font-semibold text-slate-200">Event Log</h3>
                <span className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-sm">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-3 items-start opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-slate-500 font-mono text-xs mt-0.5 shrink-0">{log.time}</span>
                    <span className={`${log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
