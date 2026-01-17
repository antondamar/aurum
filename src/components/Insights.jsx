import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ASSET_LIBRARY } from './assetLibrary';
import { fetchAIInsights } from './priceService';

const Insights = ({ rates, currency }) => {
  const { symbol: paramSymbol } = useParams();
  const navigate = useNavigate();

  // State Management
  const [selectedSymbol, setSelectedSymbol] = useState(paramSymbol || 'BTC');
  const [timeframe, setTimeframe] = useState('1mo');
  const [interval, setInterval] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Sync param changes to state
  useEffect(() => {
    if (paramSymbol) setSelectedSymbol(paramSymbol);
  }, [paramSymbol]);

// Inside Insights.jsx
const handleStartAnalysis = async () => {
  setLoading(true);
  setError(null);
  setResult(null);

  const assetInfo = ASSET_LIBRARY.find(a => a.name === selectedSymbol || a.symbol === selectedSymbol);
  let apiSymbol = assetInfo?.symbol || selectedSymbol;

  // FIX: Format symbol for Yahoo Finance before sending to backend
  if (['BTC', 'ETH', 'SOL', 'BNB'].includes(apiSymbol)) {
    apiSymbol = `${apiSymbol}-USD`;
  } else if (!apiSymbol.includes('.') && assetInfo?.type === 'stock') {
    // Optional: Add .JK for Indo stocks if not present
    apiSymbol = `${apiSymbol}.JK`;
  }

  // FIX: Pass the 'interval' state as the third argument
  const data = await fetchAIInsights(apiSymbol, timeframe, interval);
  
  if (data && !data.error) {
    setResult(data);
  } else {
    setError(data?.error || "Failed to generate AI analysis. Please check your backend logs.");
  }
  setLoading(false);
};

    const timeframeMap = {
        '1wk': '1wk',
        '1mo': '1mo',
        '3mo': '3mo',
        '1y': '1y',
        '5y': '5y'
    };

  return (
    <div className="pt-24 px-8 max-w-5xl mx-auto pb-32">
      <header className="mb-10 text-center">
        <h1 className="text-6xl font-black tracking-tighter text-white">
          AI <span className="gold-text">Analyst</span>
        </h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mt-4">
          Advanced Technical Pattern Recognition
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PARAMETERS SELECTION SIDEBAR */}
        <div className="aurum-card p-8 rounded-[2rem] h-fit space-y-8">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select Asset</label>
            <select 
              className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#D3AC2C]"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {ASSET_LIBRARY.map(asset => (
                <option key={asset.id} value={asset.symbol}>{asset.name} ({asset.symbol})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeframe</label>
            <select 
                className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#D3AC2C]"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                >
                <option value="1wk">1 Week</option>
                <option value="1mo">1 Month</option>
                <option value="3mo">3 Months</option>
                <option value="1y">1 Year</option>
                <option value="5y">Max (5 Years)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Interval</label>
            <select 
              className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#D3AC2C]"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            >
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day</option>
              <option value="1wk">1 Week</option>
            </select>
          </div>

          <button 
            onClick={handleStartAnalysis}
            disabled={loading}
            className="w-full bg-gradient-to-br from-[#FDE68A] via-[#D3AC2C] to-[#A57A03] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Start AI Analysis"}
          </button>
        </div>

        {/* RESULTS AREA */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-500 text-sm mb-6">
              {error}
            </div>
          )}

          {!result && !loading && (
            <div className="aurum-card h-[400px] rounded-[2rem] flex flex-col items-center justify-center text-zinc-600 border-dashed">
              <p className="italic">Select parameters and start the analysis engine.</p>
            </div>
          )}

          {loading && (
            <div className="aurum-card h-[400px] rounded-[2rem] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-[#D3AC2C]/20 border-t-[#D3AC2C] rounded-full animate-spin"></div>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Processing Data...</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Verdict Card */}
              <div className="aurum-card p-10 rounded-[2.5rem] border-l-4 border-[#D3AC2C]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">AI Verdict</p>
                    <h2 className="text-3xl font-black text-white">{result.trend || 'Analysis Complete'}</h2>
                  </div>
                  <div className={`px-6 py-2 rounded-full font-black text-xs tracking-widest ${
                    result.suggestion === 'BUY' ? 'bg-green-500 text-black' : 
                    result.suggestion === 'SELL' ? 'bg-red-500 text-black' : 'bg-zinc-800 text-white'
                  }`}>
                    {result.suggestion}
                  </div>
                </div>
                <p className="text-xl text-zinc-300 leading-relaxed italic">
                  "{result.verdict}"
                </p>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="aurum-card p-8 rounded-[2rem]">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Patterns Recognized</p>
                  <ul className="space-y-3">
                    {result.patterns?.map((pattern, i) => (
                      <li key={i} className="flex items-center gap-3 text-white text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D3AC2C]"></span>
                        {pattern}
                      </li>
                    )) || <li className="text-zinc-500 italic">No specific patterns identified</li>}
                  </ul>
                </div>

                <div className="aurum-card p-8 rounded-[2rem]">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Sentiment Analysis</p>
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className={`text-6xl font-black ${
                      result.sentiment_score > 60 ? 'text-green-500' : 
                      result.sentiment_score < 40 ? 'text-red-500' : 'text-[#D3AC2C]'
                    }`}>
                      {result.sentiment_score}
                    </span>
                    <span className="text-zinc-600 text-[10px] font-black uppercase mt-2">Score / 100</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;