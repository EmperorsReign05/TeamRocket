'use client';

import React from 'react';
import { ListTodo, CheckCircle2, AlertTriangle, Clock, TrendingUp, BatteryMedium } from 'lucide-react';
import type { Task, RobotState, PathfindingMetrics } from '@/core/types';

interface MetricsBarProps {
  tasks: Task[];
  robots: RobotState[];
  metrics: PathfindingMetrics;
}

export function MetricsBar({ tasks, robots, metrics }: MetricsBarProps) {
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const activeCount = robots.filter(r => r.status === 'moving' || r.status === 'assigned' || r.status === 'waiting').length;
  const fleetUtil = robots.length > 0 ? `${Math.round((activeCount / robots.length) * 100)}%` : '0%';
  const avgBattery = robots.length > 0 ? `${Math.round(robots.reduce((sum, r) => sum + r.battery, 0) / robots.length)}%` : '0%';

  return (
    <div className="w-full bg-[#131c31] rounded-xl border border-[#1e293b] flex shadow-lg divide-x divide-[#1e293b]">
      <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
        <div className="flex items-center justify-between text-slate-400 gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">Total Tasks</span>
          <ListTodo size={14} className="shrink-0" />
        </div>
        <div className="text-3xl font-bold text-white mt-1">{tasks.length}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
        <div className="flex items-center justify-between text-[#22c55e] gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">Completed</span>
          <div className="w-5 h-5 rounded-full bg-[#22c55e]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white mt-1">{completedCount}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
        <div className="flex items-center justify-between text-[#ef4444] gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">Conflicts</span>
          <div className="w-5 h-5 rounded-full bg-[#ef4444]/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white mt-1">{metrics.conflictCount}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-[#3b82f6] gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">Replans</span>
          <div className="w-5 h-5 rounded-full bg-[#3b82f6]/20 flex items-center justify-center shrink-0">
            <Clock size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mt-1">{metrics.replans}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-[#8b5cf6] gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">Fleet Util</span>
          <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center shrink-0">
            <TrendingUp size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mt-1">{fleetUtil}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-[#14b8a6] gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">Avg Battery</span>
          <div className="w-5 h-5 rounded-full bg-[#14b8a6]/20 flex items-center justify-center shrink-0">
            <BatteryMedium size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mt-1">{avgBattery}</div>
      </div>
    </div>
  );
}
