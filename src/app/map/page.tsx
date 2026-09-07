import WarehouseMap from '../components/WarehouseMap';
export default function MapPage() { return <div className="flex min-h-[calc(100vh-145px)] flex-col gap-5"><div><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">Operations / Spatial</div><h2 className="mt-1 text-2xl font-semibold text-zinc-100">Warehouse Map</h2></div><WarehouseMap focused /></div>; }
