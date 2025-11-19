import React from 'react';
import { Trade } from '../types';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface LogPanelProps {
  trades: Trade[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ trades }) => {
  // Reverse to show newest first
  const displayTrades = [...trades].reverse();

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-zinc-400 text-sm font-semibold p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900/90 backdrop-blur">
        Trade Log
      </h3>
      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {displayTrades.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm mt-10 italic">Waiting for breakout...</div>
        ) : (
          displayTrades.map((trade) => (
            <div key={trade.id} className="bg-zinc-800/50 border border-zinc-800 rounded p-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between items-center">
                <span className={`font-bold px-1.5 py-0.5 rounded ${
                    trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                    {trade.type}
                </span>
                <span className="text-zinc-500 font-mono">
                    {new Date(trade.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              
              <div className="flex justify-between font-mono text-zinc-300">
                <span>@ {trade.exitPrice ? trade.exitPrice.toFixed(2) : trade.entryPrice.toFixed(2)}</span>
                <span>{trade.quantity} Shares</span>
              </div>

              {trade.pnl !== undefined && (
                <div className={`flex items-center gap-1 font-bold font-mono ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trade.pnl >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                  ${Math.abs(trade.pnl).toFixed(2)}
                </div>
              )}
              
              <div className="text-[10px] text-zinc-500 border-t border-zinc-700/50 pt-1 mt-1 leading-tight">
                {trade.reason}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};