import React from 'react';
import { Action, AgentState, CellState, CellType, Grid } from '../types';
import { ARROW_MAP } from '../constants';

interface GridWorldProps {
  grid: Grid;
  agent: AgentState | null;
  showQValues?: boolean;
}

const GridWorld: React.FC<GridWorldProps> = ({ grid, agent, showQValues = false }) => {
  return (
    <div className="inline-block border-4 border-neutral-900 bg-neutral-900 p-1">
      <div className="grid grid-rows-3 gap-1">
        {grid.map((row, rIndex) => (
          <div key={`row-${rIndex}`} className="grid grid-cols-4 gap-1">
            {row.map((cell, cIndex) => (
              <Cell 
                key={`cell-${rIndex}-${cIndex}`} 
                cell={cell} 
                isAgentHere={agent?.row === rIndex && agent?.col === cIndex}
                showQValues={showQValues}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface CellProps {
  cell: CellState;
  isAgentHere: boolean;
  showQValues: boolean;
}

const Cell: React.FC<CellProps> = ({ cell, isAgentHere, showQValues }) => {
  // Determine background color based on type and utility
  let bgColor = 'bg-white';
  let content = null;

  if (cell.type === CellType.WALL) {
    bgColor = 'bg-neutral-800';
  } else if (cell.type === CellType.TERMINAL) {
    bgColor = cell.reward > 0 ? 'bg-neutral-100 border-double border-4 border-neutral-400' : 'bg-neutral-300';
    content = <span className="font-bold text-lg">{cell.reward > 0 ? '+1' : '-1'}</span>;
  } else if (cell.type === CellType.START) {
    content = <span className="absolute top-1 left-1 text-[10px] uppercase font-bold text-neutral-400">Start</span>;
  }

  // Visualization of Utility/Value
  const opacity = Math.min(Math.abs(cell.utility), 1) * 0.5;
  const utilityOverlay = cell.type === CellType.EMPTY || cell.type === CellType.START 
    ? (cell.utility > 0 ? `rgba(0, 0, 0, ${opacity * 0.5})` : `rgba(0, 0, 0, ${opacity})`)
    : 'transparent';


  return (
    <div 
        className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center border border-neutral-200 overflow-hidden ${bgColor}`}
        style={{
             // Subtle heatmap effect based on utility if not a wall
             backgroundColor: cell.type !== CellType.WALL && cell.type !== CellType.TERMINAL ? undefined : undefined
        }}
    >
      {/* Heatmap overlay */}
      {cell.type !== CellType.WALL && (
           <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: utilityOverlay }} />
      )}

      {/* Static Content (Start/Terminal) */}
      <div className="z-10">{content}</div>

      {/* Q-Value / Utility Text */}
      {cell.type !== CellType.WALL && (
        <div className="absolute top-1 right-1 z-10 text-[10px] font-mono text-neutral-500">
           {cell.utility.toFixed(2)}
        </div>
      )}

      {/* Policy Arrow */}
      {cell.policy && cell.type !== CellType.WALL && cell.type !== CellType.TERMINAL && !isAgentHere && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 z-0">
             <span className="text-4xl font-bold">{ARROW_MAP[cell.policy]}</span>
        </div>
      )}

      {/* Agent */}
      {isAgentHere && (
        <div className="absolute inset-0 z-20 flex items-center justify-center animate-pulse">
           <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-full shadow-lg border-2 border-white flex items-center justify-center">
             <span className="text-white text-xs">🤖</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default GridWorld;