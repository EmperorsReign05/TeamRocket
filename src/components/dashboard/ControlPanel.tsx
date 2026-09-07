'use client';

import React from 'react';
import { Plus, Play, AlertTriangle, XOctagon, AlertCircle, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  isSimulating: boolean;
  robotCount: number;
  shelfColCount: number;
  onCreateTask: () => void;
  onToggleSimulation: () => void;
  onSimulateConflict: () => void;
  onSimulateDeadlock: () => void;
  onFailAMR: () => void;
  onBlockAisle: () => void;
  onReset: () => void;
  onRobotCountChange: (count: number) => void;
  onShelfColCountChange: (count: number) => void;
}

export function ControlPanel({
  isSimulating,
  robotCount,
  shelfColCount,
  onCreateTask,
  onToggleSimulation,
  onSimulateConflict,
  onSimulateDeadlock,
  onFailAMR,
  onBlockAisle,
  onReset,
  onRobotCountChange,
  onShelfColCountChange,
}: ControlPanelProps) {
  return (
    <div className="flex-1 bg-[#131c31] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between shadow-lg">
      <h3 className="font-semibold text-slate-200 text-[13px] tracking-wide mb-3">Control Panel</h3>
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={onCreateTask} 
          className="bg-[#1e293b] border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-500 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          <Plus size={15} strokeWidth={2.5} /> Create Task
        </button>
        <button 
          onClick={onToggleSimulation} 
          className={`bg-[#1e293b] border px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap ${isSimulating ? 'border-amber-500/30 text-amber-400 hover:text-amber-300 hover:border-amber-500 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'border-green-500/30 text-green-400 hover:text-green-300 hover:border-green-500 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]'}`}
        >
          <Play size={15} strokeWidth={2.5} /> {isSimulating ? 'Pause Sim' : 'Start Sim'}
        </button>
        <button 
          onClick={onSimulateConflict} 
          className="bg-[#1e293b] border border-orange-500/30 text-orange-400 hover:text-orange-300 hover:border-orange-500 hover:bg-orange-500/20 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          <AlertTriangle size={15} strokeWidth={2.5} /> Sim Conflict
        </button>
        <button 
          onClick={onSimulateDeadlock} 
          className="bg-[#1e293b] border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          <XOctagon size={15} strokeWidth={2.5} /> Sim Deadlock
        </button>
        <button 
          onClick={onFailAMR} 
          className="bg-[#1e293b] border border-rose-500/30 text-rose-400 hover:text-rose-300 hover:border-rose-500 hover:bg-rose-500/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          <AlertCircle size={15} strokeWidth={2.5} /> Fail AMR-02
        </button>
        <button 
          onClick={onBlockAisle} 
          className="bg-[#1e293b] border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 hover:border-yellow-500 hover:bg-yellow-500/20 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          <XOctagon size={15} strokeWidth={2.5} /> Block Aisle
        </button>
        <div className="flex-1"></div>
        <button 
          onClick={onReset} 
          className="bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:border-slate-400 hover:bg-slate-700/50 hover:shadow-[0_0_15px_rgba(148,163,184,0.4)] px-3.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          <RefreshCw size={15} strokeWidth={2.5} /> Reset
        </button>
      </div>

      {/* Environment Sliders */}
      <div className="mt-3 pt-3 border-t border-[#1e293b] flex gap-6">
        <div className="flex-1 flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-20">Robots ({robotCount})</label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={robotCount} 
            onChange={e => onRobotCountChange(parseInt(e.target.value))} 
            className="w-full h-1 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400" 
          />
        </div>
        <div className="flex-1 flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-20">Shelves ({shelfColCount})</label>
          <input 
            type="range" 
            min="0" 
            max="6" 
            value={shelfColCount} 
            onChange={e => onShelfColCountChange(parseInt(e.target.value))} 
            className="w-full h-1 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#22c55e] hover:accent-[#4ade80]" 
          />
        </div>
      </div>
    </div>
  );
}
