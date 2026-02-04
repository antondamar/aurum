// src/components/tools/GoalPriceTool.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { fetchCryptoPrice, fetchStockPrice, fetchBatchCryptoPrices } from '../../data/price-api-data/priceService';
import { motion } from 'framer-motion';

import UpdatePrice from '../ui-button-folder/UpdatePrice';

const GoalPriceTool = ({ portfolios, rates, currency, setView }) => {
  const [targetPrices, setTargetPrices] = useState({});
  const [assetCurrencies, setAssetCurrencies] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceUpdateTime, setPriceUpdateTime] = useState(null);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({});
  const [localCurrency, setLocalCurrency] = useState(currency);
  const [hoveredCurrency, setHoveredCurrency] = useState(null);
  const [isHoveringSwitcher, setIsHoveringSwitcher] = useState(false);

  useEffect(() => {
    setLocalCurrency(currency);
  }, [currency]);

  // Conversion functions that handle the rates properly
  const convertToUSD = useMemo(() => (value, fromCurrency) => {
    if (!value || isNaN(value)) return 0;
    if (fromCurrency === 'USD') return parseFloat(value);
    const rate = rates[fromCurrency];
    if (!rate) return parseFloat(value);
    return parseFloat(value) / rate;
  }, [rates]);

  const convertFromUSD = useMemo(() => (value, toCurrency) => {
    if (!value || isNaN(value)) return 0;
    if (toCurrency === 'USD') return parseFloat(value);
    const rate = rates[toCurrency];
    if (!rate) return parseFloat(value);
    return parseFloat(value) * rate;
  }, [rates]);

  // Clear target when currency changes to prevent confusion
  const handleCurrencyChange = (assetName, newCurrency) => {
    setAssetCurrencies(prev => ({ ...prev, [assetName]: newCurrency }));
    // Clear the target for this asset to prevent value mismatch
    setTargetPrices(prev => {
      const next = { ...prev };
      delete next[assetName];
      return next;
    });
  };

  // 1. DATA LOGIC: Aggregate unique assets with proper calculations
  const aggregatedAssets = useMemo(() => {
    const assetMap = {};
    
    portfolios.forEach(p => {
      if (p.countInDashboard !== false) {
        p.assets.forEach(a => {
          if (!a.name || a.amount <= 0) return;
          
          if (assetMap[a.name]) {
            // Add to existing asset
            assetMap[a.name].amount += a.amount;
            // Recalculate value using current price if available
            const currentUnitPrice = currentPrices[a.name] || (a.value / a.amount) || 0;
            assetMap[a.name].value += currentUnitPrice * a.amount;
            assetMap[a.name].unitPrice = currentUnitPrice;
          } else {
            // Create new asset entry
            const currentUnitPrice = currentPrices[a.name] || (a.value / a.amount) || 0;
            assetMap[a.name] = {
              ...a,
              value: currentUnitPrice * a.amount,
              unitPrice: currentUnitPrice,
              // Ensure id exists
              id: a.id || a.name
            };
          }
        });
      }
    });
    
    return Object.values(assetMap)
      .filter(asset => asset.amount > 0) // Only show assets with holdings
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [portfolios, currentPrices]);

  // Calculate current total value
  const currentTotalValue = useMemo(() => {
    return aggregatedAssets.reduce((sum, asset) => sum + asset.value, 0);
  }, [aggregatedAssets]);

  // Get asset info from portfolio data
  const getAssetInfo = (asset) => {
    // Check if asset has coingeckoId (crypto) or symbol (stock)
    if (asset.coingeckoId) {
      return { type: 'crypto', coingeckoId: asset.coingeckoId, symbol: asset.symbol || asset.name };
    } else if (asset.symbol) {
      return { type: 'stock', symbol: asset.symbol };
    }
    return null;
  };

  // Update prices function
  const updateAllPrices = async () => {
    if (aggregatedAssets.length === 0) {
      console.log('No assets to update');
      return;
    }
    
    console.log('🔄 Starting price update...');
    setIsUpdatingPrices(true);
    
    try {
      const newPrices = { ...currentPrices };
      const cryptoAssets = [];
      const stockAssets = [];
      
      // Categorize assets
      aggregatedAssets.forEach(asset => {
        const info = getAssetInfo(asset);
        if (!info) return;
        
        if (info.type === 'crypto' && info.coingeckoId) {
          cryptoAssets.push({ name: asset.name, coingeckoId: info.coingeckoId });
        } else if (info.type === 'stock' && info.symbol) {
          stockAssets.push({ name: asset.name, symbol: info.symbol });
        }
      });
      
      // Fetch crypto prices in batch
      if (cryptoAssets.length > 0) {
        const coingeckoIds = cryptoAssets.map(a => a.coingeckoId);
        const cryptoPrices = await fetchBatchCryptoPrices(coingeckoIds);
        
        cryptoAssets.forEach(crypto => {
          if (cryptoPrices[crypto.coingeckoId] > 0) {
            newPrices[crypto.name] = cryptoPrices[crypto.coingeckoId];
            console.log(`✅ Updated ${crypto.name}: $${cryptoPrices[crypto.coingeckoId]}`);
          }
        });
      }
      
      // Fetch stock prices individually
      for (const stock of stockAssets) {
        try {
          const price = await fetchStockPrice(stock.symbol, rates?.IDR || 15600);
          if (price > 0) {
            newPrices[stock.name] = price;
            console.log(`✅ Updated ${stock.name} (${stock.symbol}): $${price}`);
          }
        } catch (error) {
          console.error(`Error fetching ${stock.name}:`, error);
        }
      }
      
      // Update state
      setCurrentPrices(newPrices);
      setPriceUpdateTime(new Date().toLocaleTimeString());
      
      console.log('✅ Price update complete');
      
    } catch (error) {
      console.error('Error in price update:', error);
    } finally {
      setIsUpdatingPrices(false);
    }
  };
  
  // 2. FINANCIAL LOGIC: Calculate projections
  const totals = useMemo(() => {
    let projectedTotal = 0;
    
    aggregatedAssets.forEach(asset => {
      const activeCurr = assetCurrencies[asset.name] || currency;
      const rawValue = targetPrices[asset.name];
      
      let targetInUSD;
      if (rawValue && rawValue !== "") {
        // Convert the user's input from their selected currency to USD
        targetInUSD = convertToUSD(parseFloat(rawValue), activeCurr);
      } else {
        targetInUSD = asset.unitPrice; // Default to current USD unit price
      }
      
      projectedTotal += (targetInUSD * asset.amount);
    });
    
    const percentChange = currentTotalValue > 0 
      ? ((projectedTotal / currentTotalValue) - 1) * 100 
      : 0;
    
    return { 
      currentTotal: currentTotalValue,
      projectedTotal, 
      percentChange
    };
  }, [aggregatedAssets, targetPrices, currentTotalValue, assetCurrencies, currency, convertToUSD]);

  // Format currency
  const formatCurrency = (val, targetCurrency = currency) => {
    if (isNaN(val) || val === undefined) return '$0.00';
    const converted = val * (rates[targetCurrency] || 1);
    return new Intl.NumberFormat(targetCurrency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency', 
      currency: targetCurrency,
      minimumFractionDigits: targetCurrency === 'IDR' ? 0 : 2,
      maximumFractionDigits: targetCurrency === 'IDR' ? 0 : 2
    }).format(converted);
  };

  // Refresh button logic
  const handleRefresh = () => {
    setIsRefreshing(true);
    updateAllPrices();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Apply global multiplier - FIXED to work with currency conversions
  const applyGlobalMultiplier = (multiplier) => {
    const newTargets = {};
    aggregatedAssets.forEach(asset => {
      const activeCurr = assetCurrencies[asset.name] || currency;
      // Calculate the target in USD, then convert to the display currency
      const targetInUSD = asset.unitPrice * multiplier;
      const targetInDisplayCurrency = convertFromUSD(targetInUSD, activeCurr);
      newTargets[asset.name] = targetInDisplayCurrency.toFixed(2);
    });
    setTargetPrices(newTargets);
  };

  const isPositive = totals.percentChange >= 0;

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700">
      {/* HERO SECTION */}
      <section className="relative p-10 rounded-[3rem] bg-zinc-900/30 border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D3AC2C]/5 blur-[120px] -mr-48 -mt-48" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
              Goal Price <span className="gold-text">Predictor</span>
            </h1>
            <p className="text-zinc-500 font-medium max-w-md">
              Simulate future value by adjusting price targets.
            </p>
            
            {/* CURRENT TOTAL VALUE DISPLAY */}
            <div className="mt-6 mb-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Current Total Portfolio Value
              </p>
              <p className="text-3xl font-black text-white tracking-tighter">
                {formatCurrency(totals.currentTotal, localCurrency)}
              </p>
            </div>
            
            <div className="flex gap-3 mt-8">
              {[2, 5, 10].map(m => (
                <button 
                  key={m} 
                  onClick={() => applyGlobalMultiplier(m)} 
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#D3AC2C] transition-all hover:border-[#D3AC2C]/30"
                >
                  Global {m}x
                </button>
              ))}
              <button 
                onClick={() => setTargetPrices({})} 
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-all hover:border-white/20"
              >
                Reset
              </button>
            </div>
          </div>

         <div className="aurum-card p-8 rounded-[2.5rem] bg-black/40 backdrop-blur-md border border-[#D3AC2C]/20 text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">
              Projected Net Worth
            </p>
            <p className="text-6xl font-black text-[#D3AC2C] tracking-tighter mb-4 tabular-nums">
              {formatCurrency(totals.projectedTotal, localCurrency)}
            </p>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-7 ${isPositive ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className={`font-bold text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(totals.percentChange).toFixed(1)}% Potential
              </span>
            </div>

            {/* NEW: CURRENCY SWITCHER (Identical to Allocation Planner) */}
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

      {/* PRICE UPDATE STATUS BAR */}
      <UpdatePrice 
        priceUpdateTime={priceUpdateTime}
        updateAllPrices={handleRefresh} // Using your existing handleRefresh logic
        isUpdatingPrices={isUpdatingPrices}
        assetCount={aggregatedAssets.length}
      />

      {/* ASSET TARGET GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aggregatedAssets.map(asset => {
          const activeAssetCurrency = assetCurrencies[asset.name] || currency;
          const rawTargetValue = targetPrices[asset.name];
          
          // Convert target price from display currency to USD for calculations
          let targetPriceInUSD;
          if (rawTargetValue && rawTargetValue !== "") {
            targetPriceInUSD = convertToUSD(parseFloat(rawTargetValue), activeAssetCurrency);
          } else {
            targetPriceInUSD = asset.unitPrice;
          }
          
          // Convert USD back to display currency for the input field
          const targetPriceInDisplayCurrency = rawTargetValue && rawTargetValue !== ""
            ? parseFloat(rawTargetValue)
            : convertFromUSD(asset.unitPrice, activeAssetCurrency);
          
          const currentHoldingValue = asset.value;
          const projectedHoldingValue = targetPriceInUSD * asset.amount;
          const holdingChangePercent = currentHoldingValue > 0 
            ? ((projectedHoldingValue / currentHoldingValue) - 1) * 100 
            : 0;
          
          return (
            <div key={asset.id} className="aurum-card p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-white font-bold text-lg">{asset.name}</h4>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                    Holdings: {asset.amount.toLocaleString()}
                  </p>
                </div>
                <select 
                  className="bg-zinc-900 border border-white/10 text-[13px] text-zinc-400 font-bold p-1.5 rounded-lg outline-none cursor-pointer hover:border-[#D3AC2C] transition-colors"
                  value={activeAssetCurrency}
                  onChange={(e) => handleCurrencyChange(asset.name, e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="IDR">IDR</option>
                </select>
              </div>

              <div className="space-y-4">
                {/* CURRENT HOLDING VALUE */}
                <div className="bg-black/30 p-3 rounded-xl">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    Current Holding Value
                  </p>
                  <p className="text-white font-bold text-lg">
                    {formatCurrency(currentHoldingValue, activeAssetCurrency)}
                  </p>
                </div>

                {/* CURRENT UNIT PRICE */}
                <div className="flex justify-between items-center py-2 border-y border-white/5">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Current Unit Price</span>
                  <span className="gold-text font-bold text-xs">
                    {formatCurrency(asset.unitPrice, activeAssetCurrency)}
                  </span>
                </div>

                {/* TARGET PRICE INPUT */}
                <div className="relative pt-2">
                  <label className="absolute -top-1 left-4 px-2 bg-[#010203] text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    Target Price ({activeAssetCurrency})
                  </label>
                  <input 
                    type="number"
                    value={targetPrices[asset.name] || ''}
                    placeholder={convertFromUSD(asset.unitPrice, activeAssetCurrency).toFixed(2)}
                    onChange={(e) => {
                      // Store the value directly as the user entered it (in selected currency)
                      setTargetPrices(prev => ({ 
                        ...prev, 
                        [asset.name]: e.target.value
                      }));
                    }}
                    className="w-full bg-transparent border border-zinc-800 p-4 rounded-xl text-[#D3AC2C] font-bold outline-none focus:border-[#D3AC2C] transition-all placeholder:text-zinc-600"
                    step="any"
                  />
                </div>

                {/* PROJECTED HOLDING VALUE */}
                <div className="bg-gradient-to-r from-[#D3AC2C]/10 to-transparent p-3 rounded-xl">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    Projected Holding Value
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-[#D3AC2C] font-black text-lg">
                      {formatCurrency(projectedHoldingValue, activeAssetCurrency)}
                    </p>
                    <span className={`text-xs font-bold ${holdingChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {holdingChangePercent >= 0 ? '+' : ''}{holdingChangePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* QUICK MULTIPLIER BUTTONS */}
                <div className="flex gap-2 pt-2">
                  {[2, 5, 10].map(multiplier => (
                    <button
                      key={multiplier}
                      onClick={() => {
                        const newTargetUSD = asset.unitPrice * multiplier;
                        const newTargetInDisplayCurrency = convertFromUSD(newTargetUSD, activeAssetCurrency);
                        setTargetPrices(prev => ({
                          ...prev,
                          [asset.name]: newTargetInDisplayCurrency.toFixed(2)
                        }));
                      }}
                      className="flex-1 text-xs font-bold text-zinc-500 hover:text-[#D3AC2C] bg-zinc-900/50 hover:bg-zinc-800 py-2 rounded-lg transition-all"
                    >
                      {multiplier}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>
      
      {/* EMPTY STATE */}
      {aggregatedAssets.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">No Assets Found</h3>
          <p className="text-zinc-500 mb-6">Add assets to your portfolio to use the Goal Price Predictor</p>
          <button 
            onClick={() => setView('Portfolio')}
            className="px-6 py-3 bg-[#D3AC2C] text-black font-bold rounded-xl hover:bg-[#A57A03] transition-colors"
          >
            Go to Portfolio
          </button>
        </div>
      )}
    </div>
  );
};

export default GoalPriceTool;