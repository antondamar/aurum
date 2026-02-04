import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import IncreaseDecrease from '../ui-button-folder/IncreaseDecrease';

const AllocationPlanner = ({ portfolios, rates, currency, setView }) => {
  const [targets, setTargets] = useState({});
  
  // --- LOCAL CURRENCY LOGIC ---
  const [localCurrency, setLocalCurrency] = useState(currency);
  const [hoveredCurrency, setHoveredCurrency] = useState(null);
  const [isHoveringSwitcher, setIsHoveringSwitcher] = useState(false);

  // Sync local currency if the global setting changes
  useEffect(() => {
    setLocalCurrency(currency);
  }, [currency]);

  // 1. DATA LOGIC: Aggregate unique assets
  const aggregatedAssets = useMemo(() => {
    const assetMap = {};
    portfolios.forEach(p => {
      if (p.countInDashboard !== false) {
        p.assets.forEach(a => {
          if (!a.name || a.amount <= 0) return;
          if (assetMap[a.name]) {
            assetMap[a.name].amount += a.amount;
            assetMap[a.name].value += a.value;
          } else {
            assetMap[a.name] = { ...a, unitPrice: a.value / a.amount };
          }
        });
      }
    });
    return Object.values(assetMap).sort((a, b) => b.value - a.value);
  }, [portfolios]);

  const totalValue = useMemo(() => 
    aggregatedAssets.reduce((sum, a) => sum + a.value, 0), 
    [aggregatedAssets]
  );

  // 2. REBALANCE LOGIC: Calculate Buy/Sell requirements
  const plannerData = useMemo(() => {
    return aggregatedAssets.map(asset => {
      const currentPct = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
      const targetPct = targets[asset.name] || 0;
      const targetValue = (targetPct / 100) * totalValue;
      const difference = targetValue - asset.value;
      
      return {
        ...asset,
        currentPct,
        targetPct,
        difference,
        action: difference > 0 ? 'BUY' : 'SELL'
      };
    });
  }, [aggregatedAssets, totalValue, targets]);

  const totalTargetPct = Object.values(targets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  // Updated formatCurrency to use localCurrency state
  const formatCurrency = (val) => {
    const converted = val * (rates[localCurrency] || 1);
    return new Intl.NumberFormat(localCurrency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency', 
      currency: localCurrency,
      maximumFractionDigits: localCurrency === 'IDR' ? 0 : 2
    }).format(converted);
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700">

      {/* REBALANCE SUMMARY CARD */}
      <section className="relative p-10 rounded-[3rem] bg-zinc-900/30 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D3AC2C]/5 blur-[120px] -mr-48 -mt-48" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2">Allocation <span className="gold-text">Planner</span></h1>
            <p className="text-zinc-500 font-medium max-w-md italic">Set target percentages for each asset to calculate necessary rebalancing moves.</p>
            
            <div className="mt-8">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Target Allocation</p>
               <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all duration-500 ${totalTargetPct === 100 ? 'bg-green-500' : totalTargetPct > 100 ? 'bg-red-500' : 'bg-[#D3AC2C]'}`}
                    style={{ width: `${Math.min(totalTargetPct, 100)}%` }}
                  />
               </div>
               <p className={`text-xs mt-2 font-bold ${totalTargetPct === 100 ? 'text-green-500' : 'text-zinc-400'}`}>
                  {totalTargetPct.toFixed(1)}% / 100%
               </p>
            </div>
          </div>

          {/* TOTAL ASSET VALUE + SWITCHER CARD */}
          <div className="aurum-card p-10 rounded-[2.5rem] bg-black/40 backdrop-blur-md border border-[#D3AC2C]/20 text-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mb-4">Total Current Asset Value</p>
            <p className="text-6xl font-black text-[#D3AC2C] tracking-tighter tabular-nums mb-7">
              {formatCurrency(totalValue)}
            </p>

            {/* CURRENCY SWITCHER */}
            <div 
              className="relative flex bg-zinc-900/50 p-1 rounded-full border border-white/5 w-fit mx-auto"
              onMouseEnter={() => setIsHoveringSwitcher(true)}
              onMouseLeave={() => {
                setIsHoveringSwitcher(false);
                setHoveredCurrency(null);
              }}
            >
              {['USD', 'CAD', 'IDR'].map((curr) => (
                <div 
                  key={curr} 
                  className="relative px-6 py-2 cursor-pointer z-10" 
                  onMouseEnter={() => setHoveredCurrency(curr)} 
                  onClick={() => setLocalCurrency(curr)}
                >
                  <span className={`text-xs font-bold transition-colors duration-200 ${
                    (isHoveringSwitcher ? hoveredCurrency === curr : localCurrency === curr) ? 'text-black' : 'text-zinc-500'
                  }`}>
                    {curr}
                  </span>
                </div>
              ))}
              <motion.div
                className="absolute inset-y-1 bg-[#D3AC2C] rounded-full z-0"
                animate={{ 
                  x: `${['USD', 'CAD', 'IDR'].indexOf(isHoveringSwitcher && hoveredCurrency ? hoveredCurrency : localCurrency) * 100}%` 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ width: '33.33%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PLANNING GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="aurum-card p-8 rounded-[2.5rem] border border-white/5 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5">
                <th className="pb-6">Asset</th>
                <th className="pb-6 text-center">Current %</th>
                <th className="pb-6 text-center">Target %</th>
                <th className="pb-6 text-right">Action Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {plannerData.map(item => (
                <tr key={item.name} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="py-6">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                       <span className="text-white font-bold">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-6 text-center text-zinc-400 font-bold tabular-nums">
                    {item.currentPct.toFixed(1)}%
                  </td>
                  
                  <td className="py-6 text-center">
                    <IncreaseDecrease 
                      itemName={item.name} 
                      targetValue={targets[item.name]} 
                      setTargets={setTargets} 
                    />
                  </td>

                  <td className="py-6 text-right">
                    {targets[item.name] ? (
                      <div className="flex flex-col items-end">
                        <span className={`text-lg font-black tracking-tighter ${item.action === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                          {item.action} {formatCurrency(Math.abs(item.difference))}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                           {Math.abs(item.difference / (item.unitPrice || 1)).toFixed(4)} Units
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-700 italic text-xs">Set target...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AllocationPlanner;