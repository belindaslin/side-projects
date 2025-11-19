import React from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';

interface CodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PYTHON_CODE = `import os
import time
import numpy as np
from datetime import datetime
from google import genai # pip install google-genai

# Configuration
SYMBOL = "SPY"
LOOKBACK_PERIOD = 30
VOLATILITY_MULTIPLIER = 2.0
TRAILING_STOP_PERCENT = 0.02

class SPYVolatilityTrader:
    def __init__(self):
        self.api_key = os.getenv("API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        
        # State
        self.balance = 100000.0
        self.shares = 0
        self.entry_price = 0.0
        self.peak_price = 0.0
        self.stop_loss_level = 0.0
        self.prices = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def get_market_analysis(self, current_price):
        """Queries Gemini for market context"""
        if not self.client:
            return
        
        recent_prices = self.prices[-15:]
        prompt = f"""
        Analyze SPY price action for a volatility breakout system.
        Recent Prices: {recent_prices}
        Current Price: {current_price}
        Position: {'LONG' if self.shares > 0 else 'FLAT'}
        
        Provide a 1-sentence technical observation regarding trend strength and risk.
        """
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            self.log(f"AI INSIGHT: {response.text}")
        except Exception as e:
            self.log(f"AI Error: {e}")

    def tick(self, current_price):
        self.prices.append(current_price)
        
        # Need enough data for lookback
        if len(self.prices) < LOOKBACK_PERIOD:
            return

        # Calculate Indicators
        window = self.prices[-LOOKBACK_PERIOD:]
        mean = np.mean(window)
        std_dev = np.std(window)
        upper_band = mean + (std_dev * VOLATILITY_MULTIPLIER)

        # Trading Logic
        if self.shares > 0:
            # 1. Manage Trade (Trailing Stop)
            if current_price > self.peak_price:
                self.peak_price = current_price
                self.stop_loss_level = self.peak_price * (1 - TRAILING_STOP_PERCENT)
                # self.log(f"New High: {current_price:.2f} | Stop Raised: {self.stop_loss_level:.2f}")
            
            if current_price <= self.stop_loss_level:
                # EXECUTE SELL
                revenue = self.shares * current_price
                pnl = revenue - (self.shares * self.entry_price)
                self.balance += revenue
                self.log(f"SELL | Price: {current_price:.2f} | PnL: {pnl:.2f} | Reason: Trailing Stop Hit")
                
                self.shares = 0
                self.get_market_analysis(current_price)

        else:
            # 2. Look for Entry (Breakout)
            if current_price > upper_band:
                # EXECUTE BUY
                quantity = int(self.balance // current_price)
                if quantity > 0:
                    cost = quantity * current_price
                    self.balance -= cost
                    self.shares = quantity
                    self.entry_price = current_price
                    self.peak_price = current_price
                    self.stop_loss_level = current_price * (1 - TRAILING_STOP_PERCENT)
                    
                    self.log(f"BUY  | Price: {current_price:.2f} | Qty: {quantity} | Reason: Breakout > {upper_band:.2f}")
                    self.get_market_analysis(current_price)

    def run(self):
        self.log("Starting SPY Volatility System...")
        # In a real app, connect to a websocket or API here
        # Simulating a random walk for demonstration
        price = 450.00
        while True:
            # Random walk simulation step
            price = price * (1 + np.random.normal(0.0002, 0.002))
            self.tick(price)
            time.sleep(0.5)

if __name__ == "__main__":
    bot = SPYVolatilityTrader()
    bot.run()
`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-3xl flex flex-col shadow-2xl max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Terminal size={16} className="text-blue-400" />
            </div>
            <div>
                <h3 className="text-zinc-100 font-bold text-sm">Python Implementation</h3>
                <p className="text-zinc-500 text-xs font-mono">spy_trader.py</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors border border-zinc-700 font-medium"
            >
              {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
              {copied ? "Copied" : "Copy Code"}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Code Area */}
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117] selection:bg-blue-500/30">
          <pre className="text-[11px] sm:text-xs font-mono leading-relaxed text-zinc-300 whitespace-pre tab-4">
            {PYTHON_CODE}
          </pre>
        </div>
        
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500 flex justify-between">
            <span>Requires: <code className="bg-zinc-800 px-1 rounded text-zinc-400">google-genai</code> <code className="bg-zinc-800 px-1 rounded text-zinc-400">numpy</code></span>
            <span>Gemini 2.5 Flash</span>
        </div>
      </div>
    </div>
  );
};
