'use client';

import React from 'react';

interface HeaderProps {
  time: string;
}

export function Header({ time }: HeaderProps) {
  return (
    <header className="h-[72px] border-b border-[#1e293b] flex items-center justify-between px-6 shrink-0 bg-[#0b1121] sticky top-0 z-50">
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
  );
}
