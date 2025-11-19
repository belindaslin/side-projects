import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert,
  Cpu,
  Zap,
  Code,
  FileCode
} from 'lucide-react';

import { MarketData, Trade, SystemState, AiAnalysisStatus } from './types';
import { 
  INITIAL_CAPITAL, 
  TICK_SPEED_MS, 
  LOOKBACK_PERIOD, 
  VOLATILITY_MULTIPLIER, 
  TRAILING_STOP_PERCENT, 
  INITIAL_SPY_PRICE,
  MAX_CHART_POINTS 
} from './constants';
import { generateMarketAnalysis } from './services/geminiService';
import { Chart } from './components/Chart';
import { Metric } from './components/Metric';
import { LogPanel } from './components/LogPanel';
import { CodeViewer } from './components/CodeViewer';

// Helper to generate random walk data
const generateNextTick = (prevPrice: number): number => {
  const volatility = 0.002; // per tick volatility
  const drift = 0.00005; // slight upward bias for SPY
  const change = prevPrice * (drift + volatility * (Math.random() - 0.5) * 2); // More volatile
  return Math.max(0.01, prevPrice + change);
};

// Helper for std dev
const calculateStandardDeviation = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
};

export default function App() {
  // --- State ---
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [rawPrices, setRawPrices] = useState<number[]>([]);
  
  const [systemState, setSystemState] = useState<SystemState>({
    isRunning: false,
    balance: INITIAL_CAPITAL,
    shares: 0,
    entryPrice: null,
    peakPrice: null,
    stopLossLevel: null,
    totalTrades: 0,
    winningTrades: 0,
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("Initialize simulation to begin AI analysis...");
  const [aiStatus, setAiStatus] = useState<AiAnalysisStatus>(AiAnalysisStatus.IDLE);
  const [isCodeOpen, setIsCodeOpen] = useState(false);

  // Refs for logic inside interval to avoid stale closures
  const stateRef = useRef(systemState);
  const priceRef = useRef<number>(INITIAL_SPY_PRICE);
  const marketDataRef = useRef<MarketData[]>([]);
  const rawPricesRef = useRef<number[]>([]);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = systemState;
  }, [systemState]);

  // --- Simulation Engine ---
  const tick = useCallback(() => {
    const currentPrice = generateNextTick(priceRef.current);
    priceRef.current = currentPrice;

    // Update raw price history
    const newRawPrices = [...rawPricesRef.current, currentPrice];
    // Limit raw history slightly larger than lookback for calculation
    if (newRawPrices.length > LOOKBACK_PERIOD + 50) {
      newRawPrices.shift();
    }
    rawPricesRef.current = newRawPrices;

    // Calculate Volatility & Bands
    const lookbackSlice = newRawPrices.slice(-LOOKBACK_PERIOD);
    const volatility = calculateStandardDeviation(lookbackSlice);
    const mean = lookbackSlice.reduce((a,b) => a+b, 0) / lookbackSlice.length;
    const upperBand = mean + (volatility * VOLATILITY_MULTIPLIER);
    const lowerBand = mean - (volatility * VOLATILITY_MULTIPLIER);

    const nextTickData: MarketData = {
      timestamp: Date.now(),
      price: currentPrice,
      volatility,
      upperBand,
      lowerBand,
      volume: Math.floor(Math.random() * 10000)
    };

    // Update Market Data for Chart
    const newData = [...marketDataRef.current, nextTickData];
    if (newData.length > MAX_CHART_POINTS) {
      newData.shift();
    }
    marketDataRef.current = newData;
    setMarketData(newData);
    setRawPrices(newRawPrices);

    // --- TRADING LOGIC ---
    const { shares, balance, entryPrice, peakPrice, stopLossLevel } = stateRef.current;

    // 1. EXIT LOGIC (Trailing Stop)
    if (shares > 0 && stopLossLevel !== null) {
      // Update Peak & Stop
      let newPeak = peakPrice || currentPrice;
      let newStop = stopLossLevel;

      if (currentPrice > newPeak) {
        newPeak = currentPrice;
        newStop = newPeak * (1 - TRAILING_STOP_PERCENT);
        // Update state with new stop level
        setSystemState(prev => ({ ...prev, peakPrice: newPeak, stopLossLevel: newStop }));
      }

      // Check for Stop Hit
      if (currentPrice <= newStop) {
        const revenue = shares * currentPrice;
        const pnl = revenue - (shares * (entryPrice || 0));
        const newBalance = balance + revenue;

        const sellTrade: Trade = {
          id: crypto.randomUUID(),
          type: 'SELL',
          entryPrice: entryPrice || 0,
          exitPrice: currentPrice,
          quantity: shares,
          timestamp: Date.now(),
          pnl,
          reason: `Trailing Stop Hit (-2% from peak $${newPeak.toFixed(2)})`,
          status: 'CLOSED'
        };

        setTrades(prev => [...prev, sellTrade]);
        setSystemState(prev => ({
          ...prev,
          balance: newBalance,
          shares: 0,
          entryPrice: null,
          peakPrice: null,
          stopLossLevel: null,
          totalTrades: prev.totalTrades + 1,
          winningTrades: pnl > 0 ? prev.winningTrades + 1 : prev.winningTrades
        }));
        
        triggerAiAnalysis(newData, sellTrade, 'FLAT');
        return; // Exit tick
      }
    }

    // 2. ENTRY LOGIC (Volatility Breakout)
    // Need enough data for reliable volatility
    if (shares === 0 && newRawPrices.length >= LOOKBACK_PERIOD) {
        // Simple breakout: Price > Upper Band
        if (currentPrice > upperBand) {
            const quantity = Math.floor(balance / currentPrice);
            const cost = quantity * currentPrice;
            
            if (quantity > 0) {
                const initialStop = currentPrice * (1 - TRAILING_STOP_PERCENT);
                
                const buyTrade: Trade = {
                    id: crypto.randomUUID(),
                    type: 'BUY',
                    entryPrice: currentPrice,
                    quantity,
                    timestamp: Date.now(),
                    reason: `Vol Breakout (Price ${currentPrice.toFixed(2)} > Band ${upperBand.toFixed(2)})`,
                    status: 'OPEN'
                };

                setTrades(prev => [...prev, buyTrade]);
                setSystemState(prev => ({
                    ...prev,
                    balance: prev.balance - cost,
                    shares: quantity,
                    entryPrice: currentPrice,
                    peakPrice: currentPrice,
                    stopLossLevel: initialStop
                }));
                
                triggerAiAnalysis(newData, buyTrade, 'LONG');
            }
        }
    }

  }, []); // Empty dependency array, relies on refs

  // --- Ai Trigger ---
  const triggerAiAnalysis = async (data: MarketData[], trade: Trade | null, position: 'LONG' | 'FLAT') => {
    if (!process.env.API_KEY) return;
    
    setAiStatus(AiAnalysisStatus.ANALYZING);
    const analysis = await generateMarketAnalysis(data, trade, position);
    setAiAnalysis(analysis);
    setAiStatus(AiAnalysisStatus.COMPLETE);
  };

  // --- Timer ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (systemState.isRunning) {
      interval = setInterval(tick, TICK_SPEED_MS);
    }
    return () => clearInterval(interval);
  }, [systemState.isRunning, tick]);


  // --- Controls ---
  const toggleSimulation = () => {
    setSystemState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    if (!systemState.isRunning && aiStatus === AiAnalysisStatus.IDLE && marketData.length > 5) {
        triggerAiAnalysis(marketData, null, systemState.shares > 0 ? 'LONG' : 'FLAT');
    }
  };

  const resetSimulation = () => {
    setSystemState({
      isRunning: false,
      balance: INITIAL_CAPITAL,
      shares: 0,
      entryPrice: null,
      peakPrice: null,
      stopLossLevel: null,
      totalTrades: 0,
      winningTrades: 0,
    });
    setTrades([]);
    setMarketData([]);
    setRawPrices([]);
    priceRef.current = INITIAL_SPY_PRICE;
    marketDataRef.current = [];
    rawPricesRef.current = [];
    setAiAnalysis("Simulation reset. Waiting for data...");
    setAiStatus(AiAnalysisStatus.IDLE);
  };

  // --- Derived UI Values ---
  const currentMarketPrice = marketData.length > 0 ? marketData[marketData.length - 1].price : INITIAL_SPY_PRICE;
  const unrealizedPnl = systemState.shares > 0 
    ? (currentMarketPrice - (systemState.entryPrice || 0)) * systemState.shares 
    : 0;
  const totalEquity = systemState.balance + (systemState.shares * currentMarketPrice);
  const winRate = systemState.totalTrades > 0 
    ? ((systemState.winningTrades / systemState.totalTrades) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">SPY Volatility Systems</h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><TrendingUp size={10}/> 30D Lookback</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span className="flex items-center gap-1"><ShieldAlert size={10}/> 2% Trailing Stop</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {process.env.API_KEY ? (
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
               <Cpu size={12} />
               <span>Gemini 2.5 Active</span>
             </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
                <span>API Key Missing</span>
            </div>
          )}
          
          <div className="h-8 w-[1px] bg-zinc-800 mx-2"></div>

          <button
            onClick={() => setIsCodeOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-sm border border-zinc-700"
          >
            <Code size={16} />
            <span className="hidden sm:inline">Python</span>
          </button>

          <button 
            onClick={toggleSimulation}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              systemState.isRunning 
                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {systemState.isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
          </button>
          <button 
            onClick={resetSimulation}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Stats */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-900/20 flex flex-col overflow-y-auto p-4 gap-4 shrink-0">
          <Metric 
            label="Total Equity" 
            value={`$${totalEquity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={DollarSign}
            highlight
          />
          
          <div className="grid grid-cols-2 gap-3">
            <Metric 
              label="SPY Price" 
              value={currentMarketPrice.toFixed(2)} 
              trend={marketData.length > 1 && currentMarketPrice > marketData[marketData.length - 2].price ? 'up' : 'down'}
            />
            <Metric 
              label="Position" 
              value={systemState.shares} 
              subValue={systemState.shares > 0 ? 'LONG' : 'FLAT'}
            />
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
             <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase">Active Position</span>
                {systemState.shares > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>}
             </div>
             
             <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between">
                    <span className="text-zinc-500">Entry</span>
                    <span className="text-zinc-200">{systemState.entryPrice ? `$${systemState.entryPrice.toFixed(2)}` : '---'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">Stop Loss</span>
                    <span className="text-rose-400 font-bold">{systemState.stopLossLevel ? `$${systemState.stopLossLevel.toFixed(2)}` : '---'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500">Unrealized P&L</span>
                    <span className={`${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {unrealizedPnl > 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
                    </span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Trades" value={systemState.totalTrades} />
            <Metric label="Win Rate" value={`${winRate}%`} />
          </div>

          {/* AI Analysis Card */}
          <div className="mt-auto bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                <Zap size={40} />
            </div>
            <h3 className="text-indigo-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                Gemini Strategy Insight
                {aiStatus === AiAnalysisStatus.ANALYZING && <span className="animate-spin text-indigo-500">⟳</span>}
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed font-mono">
                {aiAnalysis}
            </p>
            <button 
                onClick={() => triggerAiAnalysis(marketData, trades[trades.length-1] || null, systemState.shares > 0 ? 'LONG' : 'FLAT')}
                className="mt-3 text-[10px] uppercase font-bold tracking-wider text-indigo-500 hover:text-indigo-300 transition-colors"
            >
                Refresh Analysis
            </button>
          </div>
        </aside>

        {/* Center: Chart */}
        <section className="flex-1 flex flex-col relative">
          <div className="absolute top-4 left-4 z-10 flex gap-4">
             <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 p-1 px-2 rounded border border-zinc-800">
                <div className="w-3 h-0.5 bg-emerald-500"></div>
                <span className="text-zinc-400">Price</span>
             </div>
             <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 p-1 px-2 rounded border border-zinc-800">
                <div className="w-3 h-0.5 bg-purple-500 border-dashed border-t border-b"></div>
                <span className="text-zinc-400">Upper Breakout Band</span>
             </div>
             <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900/80 p-1 px-2 rounded border border-zinc-800">
                <div className="w-3 h-0.5 bg-rose-500 border-dashed border-t"></div>
                <span className="text-zinc-400">Trailing Stop</span>
             </div>
          </div>

          <div className="flex-1 w-full bg-zinc-950 p-2">
            {marketData.length > 0 ? (
                 <Chart 
                    data={marketData} 
                    stopLossLevel={systemState.stopLossLevel}
                    entryPrice={systemState.entryPrice}
                 />
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                    <Activity size={48} className="opacity-20" />
                    <p>System Offline. Press Start to initialize data feed.</p>
                </div>
            )}
          </div>
        </section>

        {/* Right Sidebar: Log */}
        <aside className="w-72 border-l border-zinc-800 bg-zinc-900/10 shrink-0">
          <LogPanel trades={trades} />
        </aside>

      </main>
      
      <CodeViewer isOpen={isCodeOpen} onClose={() => setIsCodeOpen(false)} />
    </div>
  );
}
