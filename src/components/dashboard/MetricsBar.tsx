'use client';

import React from 'react';
import { ListTodo, CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
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

  return (
    <div className="w-[480px] bg-[#131c31] rounded-xl border border-[#1e293b] flex shadow-lg divide-x divide-[#1e293b]">
      <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Total Tasks</span>
          <ListTodo size={14} />
        </div>
        <div className="text-2xl font-bold text-white mt-1">{tasks.length}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
        <div className="flex items-center justify-between text-[#22c55e]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Completed</span>
          <div className="w-5 h-5 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
            <CheckCircle2 size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mt-1">{completedCount}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1 transition-all">
        <div className="flex items-center justify-between text-[#ef4444]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Conflicts</span>
          <div className="w-5 h-5 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
            <AlertTriangle size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mt-1">{metrics.conflictCount}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-[#3b82f6]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Replans</span>
          <div className="w-5 h-5 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
            <Clock size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-xl font-bold text-white mt-1">{metrics.replans}</div>
      </div>

      <div className="flex-1 p-3 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-[#8b5cf6]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fleet Util</span>
          <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
            <TrendingUp size={12} strokeWidth={3} />
          </div>
        </div>
        <div className="text-xl font-bold text-white mt-1">{fleetUtil}</div>
      </div>
    </div>
  );
}
