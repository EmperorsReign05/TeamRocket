'use client';

import React from 'react';
import { BatteryFull, BatteryMedium } from 'lucide-react';
import type { RobotState } from '@/core/types';
import { getRobotColor } from './types';

interface FleetStatusProps {
  robots: RobotState[];
  selectedRobotId: string | null;
  onSelectRobot: (id: string | null) => void;
}

export function FleetStatus({ robots, selectedRobotId, onSelectRobot }: FleetStatusProps) {
  const onlineCount = robots.filter(r => r.status !== 'failed').length;

  return (
    <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shrink-0 shadow-lg">
      <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40">
        <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Fleet Status</h3>
        <span className="text-[11px] text-[#22c55e] font-semibold tracking-wide uppercase">
          {onlineCount} / {robots.length} Online
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {robots.map((r, idx) => {
          const isSelected = selectedRobotId === r.id;
          const color = getRobotColor(r.id, idx);
          return (
            <div 
              key={r.id} 
              onClick={() => onSelectRobot(isSelected ? null : r.id)}
              className={`px-3 py-2 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-blue-500/15 border border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                  : 'hover:bg-slate-800/30 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-3.5 h-3.5 rounded-full shadow-lg relative" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}>
                  {isSelected && <span className="absolute -inset-1 rounded-full border border-white animate-ping opacity-60"></span>}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-200 tracking-wide flex items-center gap-2">
                    {r.id}
                    {isSelected && <span className="text-[9px] bg-blue-500/30 text-blue-300 font-bold px-1.5 py-0.5 rounded uppercase">Selected</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide uppercase">
                    {r.status === 'failed' ? 'FAILED' : r.status}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-slate-200 font-mono font-medium">
                {r.battery}%
                {r.battery > 80 ? (
                  <BatteryFull size={22} className="text-[#22c55e]" strokeWidth={1.5} />
                ) : (
                  <BatteryMedium size={22} className="text-[#f59e0b]" strokeWidth={1.5} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
