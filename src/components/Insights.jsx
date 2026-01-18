import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ASSET_LIBRARY } from './assetLibrary';

const Insights = () => {
  const { symbol: paramSymbol } = useParams();
  const [selectedSymbol, setSelectedSymbol] = useState(paramSymbol || 'BTC');
  const [interval, setInterval] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  const BACKEND_URL = 'https://aurum-backend-tpaz.onrender.com';

  useEffect(() => {
    if (paramSymbol) setSelectedSymbol(paramSymbol);
  }, [paramSymbol]);

  const syncHistoricalData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/get-historical-data?symbol=${selectedSymbol}`);
      const data = await response.json();
      setSyncStatus(data);
      return data;
    } catch (err) {
      setSyncStatus({ error: "Sync failed" });
      throw err;
    }
  };

  const handleStartAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSyncStatus(null);

    try {
      // 1. Sync data first (force refresh)
      await syncHistoricalData();
      
      // 2. Wait for data to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Get AI insights
      const response = await fetch(
        `${BACKEND_URL}/get-ai-insight?symbol=${selectedSymbol}&interval=${interval}`
      );
      const data = await response.json();
      
      if (data.error) {
        setError(data.error + (data.message ? `: ${data.message}` : ''));
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message || "Failed to connect to analysis service");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-red-500';
      default: return 'bg-zinc-700';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getSuggestionColor = (suggestion) => {
    switch (suggestion?.toUpperCase()) {
      case 'BUY': return 'bg-green-500 text-black';
      case 'SELL': return 'bg-red-500 text-black';
      default: return 'bg-yellow-500 text-black';
    }
  };

  return (
    <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-32">
      <header className="mb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
          AI <span className="gold-text">Technical Analyst</span>
        </h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mt-4">
          Professional Pattern Recognition & Fibonacci Analysis
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="aurum-card p-6 md:p-8 rounded-2xl md:rounded-[2rem] h-fit space-y-8">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select Asset</label>
            <select 
              className="bg-black border border-zinc-800 p-3 md:p-4 rounded-xl text-white outline-none focus:border-[#D3AC2C]"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {ASSET_LIBRARY.map(asset => (
                <option key={asset.id} value={asset.symbol}>{asset.name} ({asset.symbol})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Analysis Mode</label>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setInterval('daily')}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${interval === 'daily' ? 'bg-[#D3AC2C] text-black shadow-lg shadow-[#D3AC2C]/20' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
              >
                SWING (6M)
              </button>
              <button 
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${interval === 'monthly' ? 'bg-[#D3AC2C] text-black shadow-lg shadow-[#D3AC2C]/20' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
              >
                MACRO (4Y)
              </button>
            </div>
          </div>

          <button 
            onClick={handleStartAnalysis}
            disabled={loading}
            className="w-full bg-gradient-to-br from-[#FDE68A] via-[#D3AC2C] to-[#A57A03] text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest transition-all hover:brightness-110 disabled:opacity-50 shadow-lg shadow-[#D3AC2C]/20"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </div>
            ) : "Start Technical Analysis"}
          </button>

          {syncStatus && (
            <div className={`p-4 rounded-xl text-sm ${syncStatus.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
              {syncStatus.error ? '⚠️ ' : '✅ '}
              {syncStatus.message || syncStatus.error || 'Data synced'}
            </div>
          )}

          {result && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">Confidence</span>
                <span className="text-white font-bold">{result.confidence_score || 0}/100</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div 
                  className="bg-[#D3AC2C] h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${result.confidence_score || 0}%` }}
                ></div>
              </div>  
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-400 text-sm mb-6">
              ⚠️ {error}
            </div>
          )}
          
          {!result && !loading && (
            <div className="aurum-card h-[400px] rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center text-zinc-500 border-dashed border-2 border-zinc-800">
              <div className="text-5xl mb-4">📈</div>
              <p className="text-lg font-medium mb-2">Technical Analysis Ready</p>
              <p className="text-sm text-zinc-600 text-center max-w-md">
                Select an asset and timeframe to perform comprehensive<br />
                Fibonacci, Moving Average, and Pattern analysis
              </p>
            </div>
          )}
          
          {loading && (
            <div className="aurum-card h-[400px] rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-[#D3AC2C]/30 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-[#D3AC2C] border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <p className="text-zinc-400 mt-6">Performing comprehensive analysis...</p>
              <p className="text-xs text-zinc-600 mt-2">Analyzing patterns, Fibonacci levels, and market structure</p>
            </div>
          )}
          
          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. EXECUTIVE SUMMARY CARD */}
              <div className="aurum-card p-8 rounded-[2.5rem] border-l-8 border-[#D3AC2C] bg-zinc-900/40">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                        {result.analysis_metadata?.interval?.toUpperCase()} ANALYSIS
                      </div>
                      <div className="text-[12px] font-bold text-[#D3AC2C]">
                        {result.technical_summary?.analysis_type}
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-5xl font-black text-white mb-2">{result.trend || 'Analysis Complete'}</h2>
                    <p className="text-zinc-400 text-sm">
                      Current Price: <span className="text-white font-bold text-lg gold-text">
                        {result.technical_summary?.price_formatted || '$0'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 italic text-zinc-300 text-lg leading-relaxed text-justify mb-5">
                  "{result.verdict}"
                </div>
                <div className="flex flex-col gap-3">
                  <div className={`px-2 py-3 rounded-full font-black text-sm tracking-widest text-center mb-5 ${getSuggestionColor(result.suggestion)}`}>
                    {result.suggestion || 'HOLD'}
                  </div>
                  <div className="text-center">
                    <div className="text-[13px] font-bold text-zinc-300 uppercase tracking-widest">Recommended Action</div>
                    <div className="text-sm text-white font-medium">{result.recommended_action || 'Monitor key levels'}</div>
                  </div>
                </div>
              </div>

              {/* 2. QUICK STATS BAR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="aurum-card p-5 rounded-2xl flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">Confidence</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{result.confidence_score}%</span>
                    <div className="w-12 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#D3AC2C] h-full" style={{ width: `${result.confidence_score}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="aurum-card p-5 rounded-2xl flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase pr-3">Risk Level</span>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black ${getRiskColor(result.risk_assessment)}`}>
                    {result.risk_assessment}
                  </span>
                </div>
                <div className="aurum-card p-5 rounded-2xl flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">News Sentiment</span>
                  <span className={`font-black text-xs ${getSentimentColor(result.technical_summary?.news?.sentiment)}`}>
                    {result.technical_summary?.news?.sentiment?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* 3. TECHNICAL DEEP-DIVE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Moving Averages */}
                <div className="aurum-card p-6 rounded-[2rem]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Moving Averages</h3>
                    <span className="text-[10px] text-white bg-zinc-800 px-2 py-1 rounded font-bold">{result.technical_summary?.moving_averages?.trend}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA20</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA20}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA50</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA50}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA200</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA200}</div>
                    </div>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed border-t border-zinc-800 pt-4">{result.ma_analysis}</p>
                </div>

                {/* Fibonacci Section */}
                <div className="aurum-card p-6 rounded-[2rem]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Fibonacci Retracement</h3>
                    <span className="text-[10px] text-[#D3AC2C] border border-[#D3AC2C]/30 px-2 py-1 rounded">{result.technical_summary?.fibonacci?.retracement_level}</span>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Current Zone</span>
                      <span className="text-white font-medium">{result.technical_summary?.fibonacci?.zone}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Position vs High</span>
                      <span className="text-red-400">{result.technical_summary?.fibonacci?.current_vs_high}</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed border-t border-zinc-800 pt-4">{result.fibonacci_analysis}</p>
                </div>
              </div>

              {/* 4. PATTERNS & NEWS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="aurum-card p-6 rounded-[2rem]">
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">Detected Patterns</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.patterns?.map((p, i) => (
                      <span key={i} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-[10px] rounded-lg border border-zinc-700">{p}</span>
                    ))}
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed italic border-t border-zinc-800 pt-4">"{result.support_resistance_analysis}"</p>
                </div>

                <div className="aurum-card p-6 rounded-[2rem]">
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">Market News Impact</h3>
                  <p className="text-zinc-300 text-xs leading-relaxed mb-4">{result.news_impact}</p>
                  <div className="space-y-2 border-t border-zinc-800 pt-4">
                    {result.technical_summary?.news?.headlines?.slice(0, 2).map((h, i) => (
                      <div key={i} className="text-[10px] text-zinc-500 flex gap-2">
                        <span className="text-[#D3AC2C]">•</span>
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. STRATEGIC ACTION PLAN */}
              <div className="aurum-card p-8 rounded-[2.5rem] bg-gradient-to-br from-zinc-900/80 to-black border border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D3AC2C]"></span> Critical Price Levels
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(result.key_levels || {}).map(([level, val]) => (
                        <div key={level} className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                          <span className="text-zinc-500 text-xs capitalize">{level.replace(/_/g, ' ')}</span>
                          <span className="text-white font-mono text-sm font-bold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center bg-[#D3AC2C]/5 p-6 rounded-2xl border border-[#D3AC2C]/10">
                    <h3 className="text-[#D3AC2C] text-xs font-black uppercase tracking-widest mb-3">Recommended Strategy</h3>
                    <p className="text-white text-lg font-bold leading-tight mb-4">{result.recommended_action}</p>
                    <div className="text-zinc-500 text-xs leading-relaxed">
                      {result.risk_assessment === 'HIGH' ? '⚠️ Caution: High volatility. Maintain tight stop-losses.' : '✅ Market structure supports the current recommendation.'}
                    </div>
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