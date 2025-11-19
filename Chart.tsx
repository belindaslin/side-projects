import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { MarketData } from '../types';

interface ChartProps {
  data: MarketData[];
  stopLossLevel: number | null;
  entryPrice: number | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-3 rounded shadow-xl font-mono text-xs">
        <p className="text-zinc-400 mb-1">Tick: {label}</p>
        <p className="text-emerald-400 font-bold">Price: ${payload[0].value.toFixed(2)}</p>
        <p className="text-purple-400">Upper Band: ${payload[1]?.value?.toFixed(2)}</p>
        <p className="text-zinc-500">Vol: {payload[0].payload.volatility.toFixed(3)}</p>
      </div>
    );
  }
  return null;
};

export const Chart: React.FC<ChartProps> = ({ data, stopLossLevel, entryPrice }) => {
  // Calculate domain for Y-Axis to keep chart focused
  const minPrice = Math.min(...data.map(d => d.price)) * 0.995;
  const maxPrice = Math.max(...data.map(d => d.price)) * 1.005;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            hide={true} 
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            orientation="right" 
            tick={{ fill: '#71717a', fontSize: 12, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Upper Breakout Band */}
          <Line 
            type="monotone" 
            dataKey="upperBand" 
            stroke="#8b5cf6" 
            strokeWidth={1} 
            strokeDasharray="4 4" 
            dot={false}
            activeDot={false}
            animationDuration={300}
          />

          {/* Main Price Line */}
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#10b981" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={300}
            isAnimationActive={false}
          />

          {/* Visual Indicators for Active Trade */}
          {stopLossLevel && (
            <ReferenceLine 
              y={stopLossLevel} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: 'STOP', position: 'right', fill: '#ef4444', fontSize: 10 }} 
            />
          )}
          
          {entryPrice && (
             <ReferenceLine 
             y={entryPrice} 
             stroke="#3b82f6" 
             strokeDasharray="2 2" 
             label={{ value: 'ENTRY', position: 'right', fill: '#3b82f6', fontSize: 10 }} 
           />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};