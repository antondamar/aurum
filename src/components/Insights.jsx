import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ASSET_LIBRARY } from './assetLibrary';
import { fetchAIInsights } from './priceService';

const Insights = () => {
  const { symbol: paramSymbol } = useParams();
  const [selectedSymbol, setSelectedSymbol] = useState(paramSymbol || 'BTC');
  const [interval, setInterval] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const BACKEND_URL = 'https://aurum-backend-tpaz.onrender.com';

  useEffect(() => {
    if (paramSymbol) setSelectedSymbol(paramSymbol);
  }, [paramSymbol]);

  const handleStartAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const assetInfo = ASSET_LIBRARY.find(a => a.symbol === selectedSymbol || a.id === selectedSymbol);
    const apiSymbol = assetInfo ? assetInfo.symbol : selectedSymbol;

    try {
      // 1. Sync data
      const syncResponse = await fetch(`${BACKEND_URL}/get-historical-data?symbol=${apiSymbol}`);
      const syncData = await syncResponse.json();
      
      if (syncData.error) {
        throw new Error(syncData.error);
      }

      // 2. Wait 1.5 seconds to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Get AI insights
      const response = await fetch(`${BACKEND_URL}/get-ai-insight?symbol=${apiSymbol}&interval=${interval}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message || "Failed to connect to analysis service");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toUpperCase()) {
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
      case 'neutral': return 'text-yellow-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="pt-24 px-4 md:px-8 max-w-6xl mx-auto pb-32">
      <header className="mb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
          AI <span className="gold-text">Technical Analyst</span>
        </h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mt-4">
          Advanced Technical Analysis with Fibonacci & Moving Averages
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
                <option key={asset.id} value={asset.symbol}>{asset.name}</option>
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
                SWING (6mo)
              </button>
              <button 
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${interval === 'monthly' ? 'bg-[#D3AC2C] text-black shadow-lg shadow-[#D3AC2C]/20' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
              >
                MACRO (4yr)
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
            ) : "Start AI Analysis"}
          </button>

          {result && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-xs">Confidence Score</span>
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
              <div className="text-4xl mb-4">📊</div>
              <p className="text-sm font-medium mb-2">Ready for Technical Analysis</p>
              <p className="text-xs text-zinc-600">Select an asset and click "Start AI Analysis"</p>
            </div>
          )}
          
          {loading && (
            <div className="aurum-card h-[400px] rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#D3AC2C] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-400">Performing deep technical analysis...</p>
              <p className="text-xs text-zinc-600 mt-2">Analyzing Fibonacci, Moving Averages, and News</p>
            </div>
          )}
          
          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Main Verdict Card */}
              <div className="aurum-card p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border-l-4 border-[#D3AC2C]">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">AI VERDICT</p>
                    <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{result.trend || 'Analysis Complete'}</h2>
                    <p className="text-zinc-400 text-sm">Pattern: <span className="text-white font-medium">{result.patterns?.[0] || 'Multiple patterns detected'}</span></p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className={`px-4 py-2 rounded-full font-black text-xs tracking-widest text-center ${result.suggestion === 'BUY' ? 'bg-green-500 text-black' : result.suggestion === 'SELL' ? 'bg-red-500 text-black' : 'bg-zinc-800 text-white'}`}>
                      {result.suggestion || 'HOLD'}
                    </div>
                    <div className={`px-4 py-2 rounded-full font-black text-xs tracking-widest text-center ${getRiskColor(result.risk_level)} text-black`}>
                      RISK: {result.risk_level || 'MEDIUM'}
                    </div>
                  </div>
                </div>
                <p className="text-lg md:text-xl text-zinc-300 leading-relaxed italic mb-6">"{result.verdict || 'Detailed analysis not available'}"</p>
                
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">RECOMMENDED ACTION</p>
                  <p className="text-white font-medium">{result.recommended_action || 'Monitor key levels and adjust position accordingly'}</p>
                </div>
              </div>

              {/* Technical Indicators Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Moving Averages Card */}
                <div className="aurum-card p-6 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">MOVING AVERAGES</p>
                  {result.technical_data?.moving_averages ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">MA20</span>
                        <span className="text-white font-bold">${result.technical_data.moving_averages.MA20}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">MA50</span>
                        <span className="text-white font-bold">${result.technical_data.moving_averages.MA50}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">MA200</span>
                        <span className="text-white font-bold">${result.technical_data.moving_averages.MA200}</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-sm text-white font-medium">{result.ma_analysis || 'No MA analysis available'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">Moving average data not available</p>
                  )}
                </div>

                {/* Fibonacci Card */}
                <div className="aurum-card p-6 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">FIBONACCI RETRACEMENT</p>
                  {result.technical_data?.fibonacci ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Current Zone</span>
                        <span className="text-white font-bold">{result.technical_data.fibonacci.current_zone}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Swing High</span>
                        <span className="text-white font-bold">${result.technical_data.fibonacci.levels.swing_high}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Swing Low</span>
                        <span className="text-white font-bold">${result.technical_data.fibonacci.levels.swing_low}</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-sm text-white font-medium">{result.fibonacci_interpretation || 'No Fibonacci analysis available'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">Fibonacci data not available</p>
                  )}
                </div>

                {/* News Sentiment Card */}
                <div className="aurum-card p-6 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">NEWS SENTIMENT</p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSentimentColor(result.technical_data?.news_sentiment).replace('text-', 'bg-')}`}></div>
                      <span className={`text-sm font-bold ${getSentimentColor(result.technical_data?.news_sentiment)}`}>
                        {result.technical_data?.news_sentiment?.toUpperCase() || 'NEUTRAL'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-zinc-800">
                      <p className="text-sm text-white font-medium mb-3">{result.news_analysis || 'News analysis not available'}</p>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">RECENT HEADLINES</p>
                        <ul className="space-y-2">
                          {result.technical_data?.recent_news?.slice(0, 3).map((news, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="text-[#D3AC2C] mt-1">•</span>
                              <span>{news}</span>
                            </li>
                          )) || <li className="text-zinc-500 text-xs">No recent news</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support & Resistance Card */}
                <div className="aurum-card p-6 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">SUPPORT & RESISTANCE</p>
                  {result.technical_data?.support_resistance ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Support</span>
                        <span className="text-green-400 font-bold">${result.technical_data.support_resistance.support}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Resistance</span>
                        <span className="text-red-400 font-bold">${result.technical_data.support_resistance.resistance}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Current Price</span>
                        <span className="text-white font-bold">${result.technical_data.current_price}</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-400">
                          Closest to <span className="text-white font-medium">{result.technical_data.support_resistance.closest_level}</span> 
                          ({result.technical_data.support_resistance.closest_level === 'Resistance' 
                            ? result.technical_data.support_resistance.distance_to_resistance_pct 
                            : result.technical_data.support_resistance.distance_to_support_pct}% away)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">Support/Resistance data not available</p>
                  )}
                </div>
              </div>

              {/* Patterns Card */}
              <div className="aurum-card p-6 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">PATTERN ANALYSIS</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.patterns?.map((pattern, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-[#D3AC2C]"></div>
                        <span className="text-white text-sm">{pattern}</span>
                      </div>
                    )) || (
                      <div className="col-span-2 text-center py-4 text-zinc-500">
                        No specific patterns detected
                      </div>
                    )}
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