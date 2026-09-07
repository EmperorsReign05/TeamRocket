'use client';

import React, { useMemo } from 'react';
import { 
  WAREHOUSE_WIDTH, 
  WAREHOUSE_HEIGHT, 
  SHELF_BLOCKS, 
  WAITING_ZONES, 
  PICKUP_STATIONS, 
  DROPOFF_STATIONS, 
  INTERSECTIONS 
} from '@/core/map/warehouse';
import type { RobotState } from '@/core/types';
import { getRobotColor, getRobotHeading } from './types';

interface WarehouseMapProps {
  robots: RobotState[];
  selectedRobotId: string | null;
  onSelectRobot: (id: string | null) => void;
  shelfColCount: number;
}

export function WarehouseMap({ 
  robots, 
  selectedRobotId, 
  onSelectRobot, 
  shelfColCount 
}: WarehouseMapProps) {
  const shelfCols = useMemo(() => {
    return Array.from(new Set(SHELF_BLOCKS.map(b => b[0]))).sort((a, b) => a - b);
  }, []);

  const displayedShelfBlocks = useMemo(() => {
    return SHELF_BLOCKS.filter(b => {
      const colIndex = shelfCols.indexOf(b[0]);
      return colIndex !== -1 && colIndex < shelfColCount;
    });
  }, [shelfColCount, shelfCols]);

  const renderShelf = (x: number, y: number, w: number, h: number) => {
    return (
      <div 
        key={`shelf-${x}-${y}`} 
        className="absolute bg-[#0f172a] border border-[#1e293b] p-[2px] rounded-sm shadow-md"
        style={{ 
          left: `calc(100% * ${x}/${WAREHOUSE_WIDTH})`, 
          top: `calc(100% * ${y}/${WAREHOUSE_HEIGHT})`, 
          width: `calc(100% * ${w}/${WAREHOUSE_WIDTH})`, 
          height: `calc(100% * ${h}/${WAREHOUSE_HEIGHT})`,
          display: 'grid',
          gridTemplateColumns: `repeat(${w}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${h}, minmax(0, 1fr))`,
          gap: '2px'
        }}
      >
        {Array.from({ length: w * h }).map((_, i) => (
          <div key={i} className="bg-[#334155] border border-[#475569] rounded-[1px] shadow-inner"></div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#131c31] rounded-xl border border-[#1e293b] flex flex-col overflow-hidden shadow-lg relative min-h-[550px]">
      
      {/* Map Header */}
      <div className="h-12 border-b border-[#1e293b] flex justify-between items-center px-5 bg-[#0b1121]/60 shrink-0 z-10">
        <h2 className="font-semibold text-slate-200 text-sm tracking-wide">Warehouse Layout (2D)</h2>
        <div className="flex gap-4 text-[11px] text-slate-400 font-medium tracking-wide">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#334155] rounded-sm"></div> Shelf</div>
          <div className="flex items-center gap-2"><div className="w-4 border-t border-slate-500 border-dashed"></div> Nav Path</div>
          <div className="flex items-center gap-2"><div className="w-4 border-t border-[#ef4444] opacity-50 border-dotted"></div> Ghost Path</div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 border border-slate-500 flex items-center justify-center relative"><div className="w-[1px] h-3 bg-slate-500 rotate-45 absolute"></div><div className="w-[1px] h-3 bg-slate-500 -rotate-45 absolute"></div></div> 
             Intersection
          </div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#22c55e] rounded-sm"></div> Pickup</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ef4444] rounded-sm"></div> Drop</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 border border-blue-500 border-dashed rounded-sm"></div> Waiting Zone</div>
        </div>
      </div>
      
      {/* Actual Map Grid */}
      <div className="flex-1 bg-[#0f172a] p-4 flex items-center justify-center overflow-hidden">
         <div className="warehouse-map w-full h-full relative" style={{ 
             display: 'grid', 
             gridTemplateColumns: `repeat(${WAREHOUSE_WIDTH}, minmax(0, 1fr))`, 
             gridTemplateRows: `repeat(${WAREHOUSE_HEIGHT}, minmax(0, 1fr))`,
             gap: '1px'
         }}>
            {/* Grid Background Lines */}
            {Array.from({ length: WAREHOUSE_WIDTH * WAREHOUSE_HEIGHT }).map((_, i) => (
                <div key={i} className="border border-[#1e293b]/50"></div>
            ))}

            {/* Coordinate Labels */}
            {Array.from({ length: WAREHOUSE_WIDTH }).map((_, i) => (
                <div key={`col-${i}`} className="absolute top-[-20px] text-[10px] text-slate-500 font-mono" style={{ left: `calc((100%/${WAREHOUSE_WIDTH}) * ${i} + (100%/(${WAREHOUSE_WIDTH} * 2)) - 4px)` }}>{i}</div>
            ))}
            {Array.from({ length: WAREHOUSE_HEIGHT }).map((_, i) => (
                <div key={`row-${i}`} className="absolute left-[-20px] text-[10px] text-slate-500 font-mono" style={{ top: `calc((100%/${WAREHOUSE_HEIGHT}) * ${i} + (100%/(${WAREHOUSE_HEIGHT} * 2)) - 6px)` }}>{i}</div>
            ))}

            {displayedShelfBlocks.map(block => renderShelf(block[0], block[1], block[2], block[3]))}

            {INTERSECTIONS.map((pos, idx) => (
              <div 
                key={`intersection-${idx}`} 
                className="absolute border border-slate-600/70 flex items-center justify-center" 
                style={{ 
                  left: `calc(100% * ${pos.x}/${WAREHOUSE_WIDTH})`, 
                  top: `calc(100% * ${pos.y}/${WAREHOUSE_HEIGHT})`, 
                  width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                  height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                }}
              >
                <div className="w-[1px] h-full bg-slate-600/60 rotate-45 absolute"></div>
                <div className="w-[1px] h-full bg-slate-600/60 -rotate-45 absolute"></div>
              </div>
            ))}

            {WAITING_ZONES.map((zone) => (
              <div 
                key={zone.id} 
                className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 flex items-center justify-center rounded-sm" 
                style={{ 
                  left: `calc(100% * ${zone.x}/${WAREHOUSE_WIDTH})`, 
                  top: `calc(100% * ${zone.y}/${WAREHOUSE_HEIGHT})`, 
                  width: `calc(100% * ${zone.width}/${WAREHOUSE_WIDTH})`, 
                  height: `calc(100% * ${zone.height}/${WAREHOUSE_HEIGHT})` 
                }}
              >
                 <span className="text-[10px] text-blue-300 font-bold text-center leading-tight">Waiting Zone<br/>{zone.id}</span>
              </div>
            ))}

            {PICKUP_STATIONS.map((station) => (
              <div 
                key={station.id} 
                className="absolute border-2 border-[#22c55e] bg-[#22c55e]/20 flex items-center justify-center rounded-sm" 
                style={{ 
                  left: `calc(100% * ${station.position.x}/${WAREHOUSE_WIDTH})`, 
                  top: `calc(100% * ${station.position.y}/${WAREHOUSE_HEIGHT})`, 
                  width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                  height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                }}
              >
                 <span className="text-[11px] text-[#22c55e] font-bold">{station.id}</span>
              </div>
            ))}

            {DROPOFF_STATIONS.map((station) => (
              <div 
                key={station.id} 
                className="absolute border-2 border-[#ef4444] bg-[#ef4444]/20 flex items-center justify-center rounded-sm" 
                style={{ 
                  left: `calc(100% * ${station.position.x}/${WAREHOUSE_WIDTH})`, 
                  top: `calc(100% * ${station.position.y}/${WAREHOUSE_HEIGHT})`, 
                  width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                  height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                }}
              >
                 <span className="text-[11px] text-[#ef4444] font-bold">{station.id}</span>
              </div>
            ))}

            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox={`0 0 ${WAREHOUSE_WIDTH} ${WAREHOUSE_HEIGHT}`}
              preserveAspectRatio="none"
            >
              {robots.map((robot, index) => {
                if (!robot.path || robot.path.length < 2) return null;
                const isSelected = selectedRobotId === robot.id;
                const color = getRobotColor(robot.id, index);
                const pointsStr = robot.path.map(p => `${p.x + 0.5},${p.y + 0.5}`).join(' ');

                return (
                  <g key={`path-${robot.id}`}>
                    {isSelected && (
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.3}
                      />
                    )}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSelected ? "0.12" : "0.08"}
                      strokeDasharray="0.2 0.15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={selectedRobotId ? (isSelected ? 1.0 : 0.25) : 0.8}
                      className="transition-all duration-300"
                    />
                    {robot.path.map((pt, pIdx) => (
                      <circle
                        key={`pt-${robot.id}-${pIdx}`}
                        cx={pt.x + 0.5}
                        cy={pt.y + 0.5}
                        r={pIdx === robot.path!.length - 1 ? 0.12 : 0.05}
                        fill={pIdx === robot.path!.length - 1 ? color : '#ffffff'}
                        opacity={selectedRobotId ? (isSelected ? 0.9 : 0.2) : 0.6}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {robots.map((robot, index) => {
              const isSelected = selectedRobotId === robot.id;
              const color = getRobotColor(robot.id, index);
              const heading = getRobotHeading(robot);
              return (
                <div 
                  key={robot.id}
                  onClick={() => onSelectRobot(isSelected ? null : robot.id)}
                  className={`absolute flex flex-col items-center justify-center transition-all duration-500 ease-in-out cursor-pointer z-30 group ${isSelected ? 'scale-110' : 'hover:scale-105'}`} 
                  style={{ 
                    left: `calc(100% * ${robot.position.x}/${WAREHOUSE_WIDTH})`, 
                    top: `calc(100% * ${robot.position.y}/${WAREHOUSE_HEIGHT})`, 
                    width: `calc(100% * 1/${WAREHOUSE_WIDTH})`, 
                    height: `calc(100% * 1/${WAREHOUSE_HEIGHT})` 
                  }}
                  title={`${robot.id} | Status: ${robot.status} | Battery: ${robot.battery}%`}
                >
                   {isSelected && (
                     <div className="absolute inset-[-4px] rounded-full border-2 border-white/80 animate-pulse pointer-events-none"></div>
                   )}

                   <div 
                     className={`w-[54%] h-[54%] rounded-full relative z-20 flex items-center justify-center transition-all ${robot.status === 'failed' ? 'animate-ping' : ''}`} 
                     style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
                   >
                     <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                   </div>

                   {heading && (
                     <div 
                       className="absolute pointer-events-none text-white/80 transition-transform duration-300"
                       style={{ 
                         transform: heading === 'up' ? 'translateY(-14px) rotate(0deg)' : 
                                    heading === 'down' ? 'translateY(14px) rotate(180deg)' : 
                                    heading === 'left' ? 'translateX(-14px) rotate(-90deg)' : 
                                    'translateX(14px) rotate(90deg)' 
                       }}
                     >
                       <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px]" style={{ borderBottomColor: color }} />
                     </div>
                   )}

                   <span className={`text-[9px] text-white mt-1 font-bold absolute top-full whitespace-nowrap transition-colors ${isSelected ? 'text-blue-300 underline font-extrabold' : 'opacity-90'}`}>
                     {robot.id}
                   </span>
                </div>
              );
            })}

         </div>
      </div>
    </div>
  );
}
