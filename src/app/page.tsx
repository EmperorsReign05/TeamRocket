'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ListTodo, Car, Map, BarChart3, Settings, 
  Plus, Play, AlertTriangle, XOctagon, AlertCircle, RefreshCw,
  BatteryFull, BatteryMedium, CheckCircle2, Clock, TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const [time, setTime] = useState<string>('');
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour12: false }) + '   Mon, 24 Feb 2025');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Shelf blocks configuration: [x, y, width, height]
  const shelfBlocks = [
    // Col 1 (x=1,2)
    [1, 1, 2, 3], [1, 9, 2, 3],
    // Col 2 (x=4,5)
    [4, 1, 2, 3], [4, 5, 2, 3], [4, 9, 2, 3],
    // Col 3 (x=7,8)
    [7, 1, 2, 3], [7, 5, 2, 3], [7, 9, 2, 3],
    // Col 4 (x=10,11)
    [10, 1, 2, 3], [10, 5, 2, 3], [10, 9, 2, 3],
    // Col 5 (x=15,16)
    [15, 1, 2, 3], [15, 5, 2, 3], [15, 9, 2, 3],
    // Col 6 (x=18,19)
    [18, 1, 2, 3], [18, 5, 2, 3], [18, 9, 2, 3],
  ];

  const renderShelf = (x: number, y: number, w: number, h: number) => {
    return (
      <div 
        key={`shelf-${x}-${y}`} 
        className="absolute bg-[#0f172a] border border-[#1e293b] p-[2px] rounded-sm shadow-md"
        style={{ 
          left: `calc(100% * ${x}/20)`, 
          top: `calc(100% * ${y}/13)`, 
          width: `calc(100% * ${w}/20)`, 
          height: `calc(100% * ${h}/13)`,
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
    <div className="flex h-screen bg-[#0b1121] text-slate-200 overflow-hidden font-sans text-sm selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <div className="w-[72px] bg-[#0b1121] border-r border-[#1e293b] flex flex-col items-center py-6 gap-8 shrink-0 z-20">
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
            <div key={i} className={`flex flex-col items-center gap-1.5 cursor-pointer w-full py-3 ${item.active ? 'text-blue-500 bg-blue-500/10 border-l-2 border-blue-500' : 'text-slate-500 hover:text-slate-300 border-l-2 border-transparent'}`}>
              <item.icon size={20} strokeWidth={item.active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        
        {/* Header */}
        <header className="h-[72px] border-b border-[#1e293b] flex items-center justify-between px-6 shrink-0 bg-[#0b1121]">
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
              <span className="text-slate-300 tracking-wider font-mono">{time || '14:32:17   Mon, 24 Feb 2025'}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Layout */}
        <div className="flex-1 p-4 flex gap-4 overflow-hidden">
          
          {/* Left Column (70%) */}
          <div className="w-[72%] flex flex-col gap-4 min-w-0 h-full">
            
            {/* Map Container */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col flex-1 overflow-hidden shadow-lg relative">
              
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
                     gridTemplateColumns: 'repeat(20, minmax(0, 1fr))', 
                     gridTemplateRows: 'repeat(13, minmax(0, 1fr))',
                     gap: '1px'
                 }}>
                    {/* Grid Background Lines (gives the graph look) */}
                    {Array.from({ length: 260 }).map((_, i) => (
                        <div key={i} className="border border-[#1e293b]/50"></div>
                    ))}

                    {/* Coordinate Labels */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={`col-${i}`} className="absolute top-[-20px] text-[10px] text-slate-500 font-mono" style={{ left: `calc((100%/20) * ${i} + (100%/40) - 4px)` }}>{i}</div>
                    ))}
                    {Array.from({ length: 13 }).map((_, i) => (
                        <div key={`row-${i}`} className="absolute left-[-20px] text-[10px] text-slate-500 font-mono" style={{ top: `calc((100%/13) * ${i} + (100%/26) - 6px)` }}>{i}</div>
                    ))}

                    {/* Professional Shelves rendering */}
                    {shelfBlocks.map(block => renderShelf(block[0], block[1], block[2], block[3]))}

                    {/* Intersections */}
                    <div className="absolute border border-slate-600 flex items-center justify-center" style={{ left: 'calc(100% * 6/20)', top: 'calc(100% * 4/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                      <div className="w-[1px] h-full bg-slate-600 rotate-45 absolute"></div>
                      <div className="w-[1px] h-full bg-slate-600 -rotate-45 absolute"></div>
                    </div>
                    <div className="absolute border border-slate-600 flex items-center justify-center" style={{ left: 'calc(100% * 6/20)', top: 'calc(100% * 8/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                      <div className="w-[1px] h-full bg-slate-600 rotate-45 absolute"></div>
                      <div className="w-[1px] h-full bg-slate-600 -rotate-45 absolute"></div>
                    </div>
                    <div className="absolute border border-slate-600 flex items-center justify-center" style={{ left: 'calc(100% * 13/20)', top: 'calc(100% * 4/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                      <div className="w-[1px] h-full bg-slate-600 rotate-45 absolute"></div>
                      <div className="w-[1px] h-full bg-slate-600 -rotate-45 absolute"></div>
                    </div>
                    <div className="absolute border border-slate-600 flex items-center justify-center" style={{ left: 'calc(100% * 13/20)', top: 'calc(100% * 8/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                      <div className="w-[1px] h-full bg-slate-600 rotate-45 absolute"></div>
                      <div className="w-[1px] h-full bg-slate-600 -rotate-45 absolute"></div>
                    </div>

                    {/* Waiting Zones */}
                    <div className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 1/20)', top: 'calc(100% * 5/13)', width: 'calc(100% * 2/20)', height: 'calc(100% * 3/13)' }}>
                       <span className="text-[10px] text-blue-300 font-bold text-center leading-tight">Waiting Zone<br/>W1</span>
                    </div>
                    <div className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 12/20)', top: 'calc(100% * 4/13)', width: 'calc(100% * 2/20)', height: 'calc(100% * 3/13)' }}>
                       <span className="text-[10px] text-blue-300 font-bold text-center leading-tight">Waiting Zone<br/>W2</span>
                    </div>
                    <div className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 12/20)', top: 'calc(100% * 8/13)', width: 'calc(100% * 2/20)', height: 'calc(100% * 3/13)' }}>
                       <span className="text-[10px] text-blue-300 font-bold text-center leading-tight">Waiting Zone<br/>W3</span>
                    </div>

                    {/* Stations */}
                    <div className="absolute border-2 border-[#22c55e] bg-[#22c55e]/20 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 1/20)', top: 'calc(100% * 0/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <span className="text-[11px] text-[#22c55e] font-bold">P1</span>
                    </div>
                    <div className="absolute border-2 border-[#22c55e] bg-[#22c55e]/20 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 14/20)', top: 'calc(100% * 0/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <span className="text-[11px] text-[#22c55e] font-bold">P2</span>
                    </div>
                    <div className="absolute border-2 border-[#ef4444] bg-[#ef4444]/20 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 6/20)', top: 'calc(100% * 12/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <span className="text-[11px] text-[#ef4444] font-bold">D1</span>
                    </div>
                    <div className="absolute border-2 border-[#ef4444] bg-[#ef4444]/20 flex items-center justify-center rounded-sm" style={{ left: 'calc(100% * 17/20)', top: 'calc(100% * 12/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <span className="text-[11px] text-[#ef4444] font-bold">D2</span>
                    </div>


                    {/* Navigable Paths */}
                    {/* AMR-01 Path */}
                    <div className="absolute border-l-2 border-[#3b82f6] border-dashed opacity-70" style={{ left: 'calc(100% * 1.5/20)', top: 'calc(100% * 0.5/13)', width: '0', height: 'calc(100% * 4/13)' }}></div>
                    <div className="absolute border-t-2 border-[#3b82f6] border-dashed opacity-70" style={{ left: 'calc(100% * 1.5/20)', top: 'calc(100% * 4.5/13)', width: 'calc(100% * 4.5/20)', height: '0' }}></div>
                    
                    {/* AMR-02 Path (Current path) */}
                    <div className="absolute border-t-2 border-[#f59e0b] border-dashed opacity-80" style={{ left: 'calc(100% * 6.5/20)', top: 'calc(100% * 4.5/13)', width: 'calc(100% * 3.5/20)', height: '0' }}></div>
                    <div className="absolute border-l-2 border-[#f59e0b] border-dashed opacity-80" style={{ left: 'calc(100% * 6.5/20)', top: 'calc(100% * 4.5/13)', width: '0', height: 'calc(100% * 4/13)' }}></div>
                    
                    {/* AMR-02 Ghost Path (Considered but discarded) */}
                    <div className="absolute border-t-2 border-[#ef4444] border-dotted opacity-60" style={{ left: 'calc(100% * 10/20)', top: 'calc(100% * 4.5/13)', width: 'calc(100% * 3.5/20)', height: '0' }}></div>
                    <div className="absolute border-l-2 border-[#ef4444] border-dotted opacity-60" style={{ left: 'calc(100% * 13.5/20)', top: 'calc(100% * 4.5/13)', width: '0', height: 'calc(100% * 3.5/13)' }}></div>
                    {/* Ghost Path X marker */}
                    <div className="absolute flex items-center justify-center opacity-60" style={{ left: 'calc(100% * 13.3/20)', top: 'calc(100% * 7.8/13)' }}>
                      <XOctagon size={12} className="text-[#ef4444]" />
                    </div>

                    {/* AMR-03 Path */}
                    <div className="absolute border-l-2 border-[#22c55e] border-dashed opacity-80" style={{ left: 'calc(100% * 6.5/20)', top: 'calc(100% * 8.5/13)', width: '0', height: 'calc(100% * 3.5/13)' }}></div>


                    {/* Robots */}
                    {/* AMR-01 */}
                    <div className="absolute flex flex-col items-center justify-center" style={{ left: 'calc(100% * 1/20)', top: 'calc(100% * 1/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <div className="w-[50%] h-[50%] rounded-full bg-[#3b82f6] shadow-[0_0_12px_#3b82f6] relative z-20"></div>
                       <span className="text-[9px] text-white mt-1 font-bold absolute top-full">AMR-01</span>
                    </div>

                    {/* AMR-02 */}
                    <div className="absolute flex flex-col items-center justify-center" style={{ left: 'calc(100% * 10/20)', top: 'calc(100% * 4/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <div className="w-[50%] h-[50%] rounded-full bg-[#f59e0b] shadow-[0_0_15px_#f59e0b] relative z-20 animate-pulse"></div>
                       <span className="text-[9px] text-white mt-1 font-bold absolute bottom-full">AMR-02</span>
                    </div>

                    {/* AMR-03 */}
                    <div className="absolute flex flex-col items-center justify-center" style={{ left: 'calc(100% * 6/20)', top: 'calc(100% * 8/13)', width: 'calc(100% * 1/20)', height: 'calc(100% * 1/13)' }}>
                       <div className="w-[50%] h-[50%] rounded-full bg-[#22c55e] shadow-[0_0_12px_#22c55e] relative z-20"></div>
                       <span className="text-[9px] text-white mt-1 font-bold absolute left-full ml-1 whitespace-nowrap">AMR-03</span>
                    </div>


                 </div>
              </div>
            </div>

            {/* Bottom Panel (Fixed Height) */}
            <div className="h-[120px] shrink-0 flex gap-4">
                
                {/* Control Panel */}
                <div className="flex-1 bg-[#131c31] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between shadow-lg">
                  <h3 className="font-semibold text-slate-200 text-[13px] tracking-wide mb-3">Control Panel</h3>
                  <div className="flex flex-wrap gap-2.5">
                    <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20">
                      <Plus size={14} strokeWidth={2.5} /> Create Task
                    </button>
                    <button className="bg-[#22c55e] hover:bg-green-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-green-500/20">
                      <Play size={14} strokeWidth={2.5} /> Start Simulation
                    </button>
                    <button className="bg-[#f59e0b] hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20">
                      <AlertTriangle size={14} strokeWidth={2.5} /> Simulate Conflict
                    </button>
                    <button className="bg-[#ef4444] hover:bg-red-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-red-500/20">
                      <XOctagon size={14} strokeWidth={2.5} /> Simulate Deadlock
                    </button>
                    <button className="bg-[#475569] hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                      <AlertCircle size={14} strokeWidth={2.5} /> Fail AMR-02
                    </button>
                    <button className="bg-[#8b5cf6] hover:bg-purple-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/20">
                      <XOctagon size={14} strokeWidth={2.5} /> Block Aisle
                    </button>
                    <div className="flex-1"></div>
                    <button className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                      <RefreshCw size={14} strokeWidth={2.5} /> Reset
                    </button>
                  </div>
                </div>

                {/* Mini Metrics */}
                <div className="w-[480px] bg-[#131c31] rounded-xl border border-[#1e293b] flex shadow-lg divide-x divide-[#1e293b]">
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-slate-400">
                         <span className="text-[10px] font-semibold uppercase tracking-wider">Total Tasks</span>
                         <ListTodo size={14} />
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">12</div>
                   </div>
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-[#22c55e]">
                         <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Completed</span>
                         <div className="w-5 h-5 rounded-full bg-[#22c55e]/20 flex items-center justify-center"><CheckCircle2 size={12} strokeWidth={3} /></div>
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">9</div>
                   </div>
                   <div className="flex-1 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between text-[#ef4444]">
                         <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Collisions</span>
                         <div className="w-5 h-5 rounded-full bg-[#ef4444]/20 flex items-center justify-center"><AlertTriangle size={12} strokeWidth={3} /></div>
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">0</div>
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
          <div className="w-[28%] flex flex-col gap-4 min-w-0 h-full">
            
            {/* Fleet Status */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shrink-0 shadow-lg">
              <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40">
                <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Fleet Status</h3>
                <span className="text-[11px] text-[#22c55e] font-semibold tracking-wide uppercase">3 / 3 Online</span>
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                
                {/* AMR 01 */}
                <div className="px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"></div>
                    <div>
                      <div className="font-semibold text-sm text-slate-200 tracking-wide">AMR-01</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">Docked (P1)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-slate-200 font-mono font-medium">
                    87%
                    <BatteryFull size={22} className="text-[#22c55e]" strokeWidth={1.5} />
                  </div>
                </div>

                {/* AMR 02 */}
                <div className="px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] shadow-[0_0_10px_#f59e0b]"></div>
                    <div>
                      <div className="font-semibold text-sm text-slate-200 tracking-wide">AMR-02</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">En route to T-102</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-slate-200 font-mono font-medium">
                    62%
                    <BatteryMedium size={22} className="text-[#f59e0b]" strokeWidth={1.5} />
                  </div>
                </div>

                {/* AMR 03 */}
                <div className="px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]"></div>
                    <div>
                      <div className="font-semibold text-sm text-slate-200 tracking-wide">AMR-03</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">Waiting (W2)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-slate-200 font-mono font-medium">
                    91%
                    <BatteryFull size={22} className="text-[#22c55e]" strokeWidth={1.5} />
                  </div>
                </div>

              </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shrink-0 shadow-lg">
              <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40">
                <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Active Tasks</h3>
                <span className="text-[11px] text-[#22c55e] font-semibold tracking-wide uppercase">2 Active</span>
              </div>
              <div className="p-2 flex flex-col">
                
                <div className="px-4 py-3 border-b border-[#1e293b]/50 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-slate-200 tracking-wide">T-102</span>
                        <span className="text-[11px] text-slate-400">Shelf A3 → B7</span>
                    </div>
                    <div className="text-[11px] text-[#f59e0b] font-bold tracking-wider">AMR-02</div>
                  </div>
                  <span className="bg-[#1e3a8a]/40 text-[#60a5fa] border border-[#1e3a8a] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">In Progress</span>
                </div>

                <div className="px-4 py-3 border-b border-[#1e293b]/50 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-slate-200 tracking-wide">T-103</span>
                        <span className="text-[11px] text-slate-400">Shelf C1 → D2</span>
                    </div>
                    <div className="text-[11px] text-[#22c55e] font-bold tracking-wider">AMR-03</div>
                  </div>
                  <span className="bg-[#14532d]/40 text-[#4ade80] border border-[#14532d] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">Assigned</span>
                </div>

                <div className="px-4 py-3 flex justify-between items-center opacity-60">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-slate-200 tracking-wide">T-104</span>
                        <span className="text-[11px] text-slate-400">Shelf B6 → A1</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold tracking-wider">Unassigned</div>
                  </div>
                  <span className="bg-[#1e293b]/60 text-slate-400 border border-[#334155] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">Pending</span>
                </div>

              </div>
            </div>

            {/* Event Log */}
            <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex-1 flex flex-col min-h-0 shadow-lg">
              <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40 shrink-0">
                <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Event Log</h3>
                <span className="flex items-center gap-2 text-[10px] text-[#22c55e] font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e] animate-pulse"></span>
                  Live
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 text-[12px] font-medium tracking-wide">
                {[
                  { time: '14:32', text: 'AMR-01 docked at P1', type: 'info' },
                  { time: '14:31', text: 'AMR-02 reserved i05 (t=12-14s)', type: 'info' },
                  { time: '14:31', text: 'AMR-03 waiting at W2 (aisle busy)', type: 'warning' },
                  { time: '14:30', text: 'Task T-102 assigned to AMR-02', type: 'info' },
                  { time: '14:29', text: 'AMR-03 reached waiting zone W2', type: 'info' },
                  { time: '14:28', text: 'Path planned for AMR-03', type: 'info' },
                  { time: '14:27', text: 'Task T-103 created', type: 'info' },
                  { time: '14:26', text: 'AMR-02 passed intersection i08', type: 'info' },
                  { time: '14:25', text: 'System initialized', type: 'info' },
                ].map((log, idx) => (
                  <div key={idx} className="flex gap-4 items-start opacity-80 hover:opacity-100 transition-opacity pb-2">
                    <span className="text-slate-500 font-mono text-[11px] shrink-0 pt-0.5">{log.time}</span>
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
