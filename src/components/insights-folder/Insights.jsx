import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ASSET_LIBRARY } from '../../data/assets-data/assetLibrary';

const Insights = () => {
  const { symbol: paramSymbol } = useParams();
  const [selectedSymbol, setSelectedSymbol] = useState(paramSymbol || 'BTC');
  const [interval, setInterval] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [timeframe, setTimeframe] = useState('2y');

  const BACKEND_URL = 'https://aurum-backend-tpaz.onrender.com';

  useEffect(() => {
    if (paramSymbol) setSelectedSymbol(paramSymbol);
  }, [paramSymbol]);

  const handleStartAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSyncStatus(null);

    try {
      // REMOVED: await syncHistoricalData(); 
      // The backend /get-ai-insight already calls sync if data is missing.
      
      const response = await fetch(
        `${BACKEND_URL}/get-ai-insight?symbol=${selectedSymbol}&interval=${interval}&timeframe=${timeframe}`
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
      default: return '';
    }
  };

  const getSuggestionColor = (suggestion) => {
    switch (suggestion?.toUpperCase()) {
      case 'BUY': return 'bg-green-500 text-black';
      case 'SELL': return 'bg-red-500 text-black';
      default: return 'bg-yellow-500 text-black';
    }
  };

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="pt-14 px-4 md:px-8 max-w-7xl mx-auto pb-32">
      <header className="mb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
          AI <span className="gold-text">Technical Analyst</span>
        </h1>
        <p className="text-zinc-400 uppercase tracking-widest text-[12px] font-bold mt-4">
          Indicator Analysis & Pattern Recognition
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

          {/* Timeframe Selection - Fixed options */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeframe</label>
            <select 
              className="bg-black border border-zinc-800 p-3 rounded-xl text-white outline-none focus:border-[#D3AC2C]"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              {interval === 'daily' ? (
                <>
                  <option value="15d">15 Days</option>
                  <option value="1m">1 Month</option>
                  <option value="2m">2 Months</option>
                  <option value="3m">3 Months</option>
                  <option value="4m">4 Months</option>
                  <option value="5m">5 Months</option>
                  <option value="6m">6 Months</option>
                  <option value="1y">1 Year</option>
                  <option value="2y">2 Years</option>
                  <option value="4y">4 Years</option>
                  {selectedSymbol === 'BTC' && <option value="10y">10 Years</option>}
                </>
              ) : (
                <>
                  <option value="1y">1 Year</option>
                  <option value="2y">2 Years</option>
                  <option value="3y">3 Years</option>
                  <option value="4y">4 Years</option>
                  <option value="5y">5 Years</option>
                  {selectedSymbol === 'BTC' && <option value="10y">10 Years</option>}
                </>
              )}
            </select>
          </div>
          
          {/* Interval Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Interval</label>
            <div className="flex gap-2 mt-2">
              {['daily', 'monthly'].map(mode => (
                <button 
                  key={mode}
                  onClick={() => setInterval(mode)}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${interval === mode ? 'bg-[#D3AC2C] text-black' : 'bg-zinc-900 text-zinc-500'}`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
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
              <div className="aurum-card p-4 rounded-2xl bg-zinc-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">
                    {result.technical_summary?.volume?.period_label || 'Last Period'}
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                    result.technical_summary?.volume?.vs_average === 'Above Average' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {result.technical_summary?.volume?.change_pct > 0 ? '+' : ''}
                    {result.technical_summary?.volume?.change_pct}%
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-bold text-lg">
                    ${result.technical_summary?.volume?.last_period?.toLocaleString() || '0'}
                  </span>
                  <span className="text-zinc-600 text-[10px] uppercase">
                    {result.analysis_metadata?.interval}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-800/50">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-[9px] uppercase">
                      {result.technical_summary?.volume?.average_label || 'Average'}
                    </span>
                    <span className="text-zinc-400 text-xs font-medium">
                      ${result.technical_summary?.volume?.average?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>

                {/* Optional: Volume Trend Indicator */}
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      result.technical_summary?.volume?.vs_average === 'Above Average'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, Math.abs(result.technical_summary?.volume?.change_pct || 0) + 50)}%` 
                    }}
                  ></div>
                </div>
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
                      {result.analysis_metadata?.price_source && (
                        <span className="text-[10px] text-zinc-600 ml-2">
                          ({result.analysis_metadata.price_source})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 text-zinc-300 text-lg leading-relaxed text-justify mb-5">
                  {result.verdict}
                </div>
                <div className="flex flex-col gap-3">
                  <div className={`px-2 py-3 rounded-full font-black text-sm tracking-widest text-center mb-5 ${getSuggestionColor(result.suggestion)}`}>
                    {result.suggestion || 'HOLD'}
                  </div>
                  <div className="text-center">
                    <div className="text-[13px] font-bold gold-text uppercase tracking-widest">Recommended Action</div>
                    <div className="text-sm text-white font-medium">{result.recommended_action || 'Monitor key levels'}</div>
                  </div>
                </div>
              </div>

              {/* 2. QUICK STATS BAR - Now only 2 items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* 3. TECHNICAL DEEP-DIVE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Moving Averages */}
                <div className="aurum-card p-6 rounded-[2rem]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Moving Averages</h3>
                    <span className="text-[10px] text-white px-2 py-1 rounded font-bold">*{result.technical_summary?.moving_averages?.trend}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA13</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA13}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA20</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA20}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA21</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA21}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA50</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA50}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">MA200</div>
                      <div className="text-white font-bold text-xs">{result.technical_summary?.moving_averages?.MA200}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-1">Alignment</div>
                      <div className="text-white font-bold text-xs text-[10px]">{result.technical_summary?.moving_averages?.alignment}</div>
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

              

              {/* 4. VOLUME ANALYSIS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="aurum-card p-6 rounded-[2rem]">
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                    Volume Analysis
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div className="bg-black/40 p-4 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-2">
                        {result.technical_summary?.volume?.period_label}
                      </div>
                      <div className="text-white font-bold text-lg">
                        ${result.technical_summary?.volume?.last_period?.toLocaleString() || '0'}
                      </div>
                      <div className={`text-[10px] font-bold mt-1 ${
                        result.technical_summary?.volume?.vs_average === 'Above Average'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {result.technical_summary?.volume?.vs_average}
                      </div>
                    </div>

                    <div className="bg-black/40 p-4 rounded-xl">
                      <div className="text-zinc-500 text-[9px] uppercase mb-2">
                        {result.technical_summary?.volume?.average_label}
                      </div>
                      <div className="text-white font-bold text-lg">
                        ${result.technical_summary?.volume?.average?.toLocaleString() || '0'}
                      </div>
                      <div className="text-zinc-500 text-[10px] font-bold mt-1">
                        {result.technical_summary?.volume?.change_pct > 0 ? '+' : ''}
                        {result.technical_summary?.volume?.change_pct}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-500">Volume Trend</span>
                      <span className={`font-bold ${
                        result.technical_summary?.volume?.vs_average === 'Above Average'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {result.technical_summary?.volume?.vs_average}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          result.technical_summary?.volume?.vs_average === 'Above Average'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${50 + (result.technical_summary?.volume?.change_pct / 2)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed border-t border-zinc-800 pt-4">
                    {result.volume_analysis || 'Volume analysis indicates moderate market participation.'}
                  </p>
                </div>

                {/* Patterns Section (existing) */}
                <div className="aurum-card p-6 rounded-[2rem]">
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                    Detected Patterns
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.patterns?.map((p, i) => (
                      <span key={i} className="px-3 py-1 bg-[#D3AC2C]/5 gold-text text-[12px] rounded-lg border border-zinc-700">
                        {p}
                      </span>
                    ))}
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed border-t border-zinc-800 pt-4">
                    {result.support_resistance_analysis}
                  </p>
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
                          <span className="text-white text-sm font-bold bg-black/40 px-3 py-1 rounded-lg">
                            {typeof val === 'number' ? formatCurrency(val) : val}
                          </span>
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