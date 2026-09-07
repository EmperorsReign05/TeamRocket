'use client';
import ControlPanel from './components/ControlPanel';
import EventLog from './components/EventLog';
import FleetStatus from './components/FleetStatus';
import Metrics from './components/Metrics';
import TaskTable from './components/TaskTable';
import WarehouseMap from './components/WarehouseMap';
export default function DashboardPage() { return <div className="flex min-w-0 flex-col gap-5"><div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="flex min-w-0 flex-col gap-5"><WarehouseMap /><ControlPanel /><Metrics /></div><aside className="flex min-h-0 max-h-[calc(100vh-145px)] flex-col gap-5 overflow-y-auto pr-1 xl:sticky xl:top-0"><FleetStatus /><TaskTable /><EventLog /></aside></div></div>; }
