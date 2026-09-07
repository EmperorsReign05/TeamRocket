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
      <div className="flex flex-wrap gap-2.5">
        <button 
          onClick={onCreateTask} 
          className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={14} strokeWidth={2.5} /> Create Task
        </button>
        <button 
          onClick={onToggleSimulation} 
          className={`hover:brightness-110 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${isSimulating ? 'bg-amber-500 shadow-amber-500/20' : 'bg-[#22c55e] shadow-green-500/20'}`}
        >
          <Play size={14} strokeWidth={2.5} /> {isSimulating ? 'Pause Sim' : 'Start Sim'}
        </button>
        <button 
          onClick={onSimulateConflict} 
          className="bg-[#f59e0b] hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          <AlertTriangle size={14} strokeWidth={2.5} /> Sim Conflict
        </button>
        <button 
          onClick={onSimulateDeadlock} 
          className="bg-[#ef4444] hover:bg-red-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-red-500/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          <XOctagon size={14} strokeWidth={2.5} /> Sim Deadlock
        </button>
        <button 
          onClick={onFailAMR} 
          className="bg-[#475569] hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors hover:-translate-y-0.5 active:translate-y-0"
        >
          <AlertCircle size={14} strokeWidth={2.5} /> Fail AMR-02
        </button>
        <button 
          onClick={onBlockAisle} 
          className="bg-[#8b5cf6] hover:bg-purple-600 text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          <XOctagon size={14} strokeWidth={2.5} /> Block Aisle
        </button>
        <div className="flex-1"></div>
        <button 
          onClick={onReset} 
          className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 px-3.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors hover:-translate-y-0.5 active:translate-y-0"
        >
          <RefreshCw size={14} strokeWidth={2.5} /> Reset
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
