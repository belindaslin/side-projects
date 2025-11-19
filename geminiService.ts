import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "../constants";
import { MarketData, Trade } from "../types";

export const generateMarketAnalysis = async (
  recentData: MarketData[],
  lastTrade: Trade | null,
  positionStatus: 'LONG' | 'FLAT'
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "API Key missing. Cannot generate analysis.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Format data for the prompt
    const prices = recentData.slice(-15).map(d => d.price.toFixed(2)).join(', ');
    const currentPrice = recentData[recentData.length - 1].price.toFixed(2);
    const volatility = recentData[recentData.length - 1].volatility.toFixed(2);

    const prompt = `
      You are an algorithmic trading assistant specializing in SPY (S&P 500).
      
      Current Market Context:
      - Recent Prices: [${prices}]
      - Current Price: $${currentPrice}
      - 30-Period Volatility: ${volatility}
      - Current Position: ${positionStatus}
      ${lastTrade ? `- Last Trade: ${lastTrade.type} at $${lastTrade.exitPrice || lastTrade.entryPrice}` : ''}

      The strategy uses a 30-day volatility-adjusted lookback for breakouts and a strict 2% trailing stop-loss.

      Provide a concise, 2-sentence analysis. 
      1. Interpret the immediate trend (breakout vs consolidation).
      2. Comment on risk management (is the stop loss likely to hit?).
      Do not give financial advice. Keep it technical and observational.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "AI Analysis temporarily unavailable due to network or API limits.";
  }
};