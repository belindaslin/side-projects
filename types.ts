export interface MarketData {
  timestamp: number;
  price: number;
  volatility: number; // 30-period standard deviation
  upperBand: number; // Breakout level
  lowerBand: number;
  volume: number;
}

export interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  timestamp: number;
  pnl?: number;
  reason: string;
  status: 'OPEN' | 'CLOSED';
}

export interface SystemState {
  isRunning: boolean;
  balance: number;
  shares: number;
  entryPrice: number | null;
  peakPrice: number | null;
  stopLossLevel: number | null; // The dynamic trailing stop value
  totalTrades: number;
  winningTrades: number;
}

export enum AiAnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}