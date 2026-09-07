'use client';

import React from 'react';
import { LayoutDashboard, ListTodo, Car, Map, BarChart3, Settings } from 'lucide-react';

interface SidebarNavProps {
  onNavigate: (label: string) => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: ListTodo, label: 'Tasks' },
    { icon: Car, label: 'Fleet' },
    { icon: Map, label: 'Map' },
    { icon: BarChart3, label: 'Analytics' },
    { icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="w-[72px] bg-[#0b1121] border-r border-[#1e293b] flex flex-col items-center py-6 gap-8 shrink-0 z-20 sticky top-0 h-screen">
      <div className="w-10 h-10 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg border border-[#334155]">
        <span className="opacity-80">R</span>
      </div>
      <nav className="flex flex-col gap-2 w-full">
        {navItems.map((item, i) => (
          <div 
            key={i} 
            onClick={() => onNavigate(item.label)} 
            className={`flex flex-col items-center gap-1.5 cursor-pointer w-full py-3 transition-colors ${item.active ? 'text-blue-500 bg-blue-500/10 border-l-2 border-blue-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border-l-2 border-transparent'}`}
          >
            <item.icon size={20} strokeWidth={item.active ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
