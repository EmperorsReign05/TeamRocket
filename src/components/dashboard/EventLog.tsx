'use client';

import React, { useRef, useEffect } from 'react';
import type { LogEntry } from './types';

interface EventLogProps {
  logs: LogEntry[];
}

export function EventLog({ logs }: EventLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col shadow-lg">
      <div className="h-12 px-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1121]/40 shrink-0">
        <h3 className="font-semibold text-slate-200 tracking-wide text-sm">Event Log</h3>
        <span className="flex items-center gap-2 text-[10px] text-[#22c55e] font-bold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e] animate-pulse"></span>
          Live
        </span>
      </div>
      <div 
        ref={logContainerRef} 
        className="h-[250px] overflow-y-auto px-5 py-4 flex flex-col gap-2 text-[12px] font-medium tracking-wide"
      >
        {[...logs].reverse().map((log, idx) => (
          <div key={idx} className="flex gap-4 items-start opacity-80 hover:opacity-100 transition-opacity pb-2">
            <span className="text-slate-500 font-mono text-[11px] shrink-0 pt-0.5">{log.time}</span>
            <span className={`${log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
              {log.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
