import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
export default function Shell({ children }: { children: ReactNode }) { return <div className="flex min-h-screen bg-[radial-gradient(circle_at_75%_0%,rgba(34,211,238,0.055),transparent_32%),#111113] text-sm text-zinc-200"><Sidebar /><div className="ml-[76px] flex min-h-screen min-w-0 flex-1 flex-col max-[900px]:ml-[60px] max-[520px]:ml-0"><Header /><main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5 max-[700px]:p-3">{children}</main></div></div>; }
