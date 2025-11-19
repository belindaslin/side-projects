import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  subValue?: string;
  highlight?: boolean;
}

export const Metric: React.FC<MetricProps> = ({ label, value, icon: Icon, trend, subValue, highlight }) => {
  return (
    <div className={`bg-zinc-900 border ${highlight ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-zinc-800'} p-4 rounded-lg flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={16} className="text-zinc-400" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-mono font-bold ${
            trend === 'up' ? 'text-emerald-400' : 
            trend === 'down' ? 'text-rose-400' : 
            'text-zinc-100'
        }`}>
          {value}
        </span>
      </div>
      {subValue && <span className="text-xs text-zinc-500 font-mono mt-1">{subValue}</span>}
    </div>
  );
};