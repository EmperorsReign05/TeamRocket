'use client';

import React from 'react';
import type { Task, RobotState } from '@/core/types';
import { getRobotColor } from './types';

interface ActiveTasksProps {
  tasks: Task[];
  robots: RobotState[];
}

export function ActiveTasks({ tasks, robots }: ActiveTasksProps) {
  const activeCount = tasks.filter(t => t.status !== 'pending' && t.status !== 'completed').length;

  return (
    <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shrink-0 shadow-lg">
      <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40">
        <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Active Tasks</h3>
        <span className="text-[11px] text-[#22c55e] font-semibold tracking-wide uppercase">
          {activeCount} Active
        </span>
      </div>
      <div className="p-2 flex flex-col max-h-[220px] overflow-y-auto">
        {tasks.map((t) => {
          const assignedIdx = robots.findIndex(r => r.id === t.assignedRobotId);
          const robotColor = t.assignedRobotId 
            ? getRobotColor(t.assignedRobotId, assignedIdx >= 0 ? assignedIdx : 0) 
            : '#94a3b8';

          return (
            <div 
              key={t.id} 
              className={`px-4 py-3 border-b border-[#1e293b]/50 flex justify-between items-center ${t.status === 'pending' ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-slate-200 tracking-wide">{t.id}</span>
                  <span className="text-[11px] text-slate-400">({t.pickup.x},{t.pickup.y}) → ({t.dropoff.x},{t.dropoff.y})</span>
                </div>
                <div className="text-[11px] font-bold tracking-wider" style={{ color: robotColor }}>
                  {t.assignedRobotId ?? 'Unassigned'}
                </div>
              </div>
              
              {t.status === 'in_progress' && (
                <span className="bg-[#1e3a8a]/40 text-[#60a5fa] border border-[#1e3a8a] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">
                  In Progress
                </span>
              )}
              {t.status === 'assigned' && (
                <span className="bg-[#14532d]/40 text-[#4ade80] border border-[#14532d] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">
                  Assigned
                </span>
              )}
              {t.status === 'pending' && (
                <span className="bg-[#1e293b]/60 text-slate-400 border border-[#334155] text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">
                  Pending
                </span>
              )}
              {t.status === 'completed' && (
                <span className="bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">
                  Completed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
