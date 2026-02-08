import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ASSET_LIBRARY } from '../../data/assets-data/assetLibrary';
import IncreaseDecrease from '../ui-button-folder/IncreaseDecrease';
import { calculateFIFOMetrics } from '../../data/algo-data/FIFO'
import { calculateAverageBuyPrice } from '../../data/algo-data/CostBasis';

const BACKEND_URL = 'https://aurum-backend-tpaz.onrender.com';

const AssetHistory = ({ portfolios, setPortfolios, currency, setCurrency, rates }) => {
  const { portfolioId, assetId } = useParams();
  const navigate = useNavigate();

  const handleBackNavigation = () => {
    // Navigate back to the specific portfolio using its ID
    navigate(`/portfolio`, { 
      state: { 
        activePortfolioId: Number(portfolioId),
        // Add this to ensure the portfolio is selected
        highlightPortfolio: true 
      } 
    });
  };

  const [editingTxId, setEditingTxId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    type: 'BUY',
    price: '',
    amount: '',
    date: '',
    editCurrency: 'USD'
  });
  const [hoveredCurrency, setHoveredCurrency] = useState(null);
  const [isHoveringSwitcher, setIsHoveringSwitcher] = useState(false);
  const [localCurrency, setLocalCurrency] = useState(currency);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayTxs, setDisplayTxs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [previewRates, setPreviewRates] = useState({ editRate: 1, localRate: 1 });

  useEffect(() => {
    const fetchPreviewRates = async () => {
      if (!editingTxId) return;
      
      try {
        // 1. Fetch historical rate for the currency being EDITED (e.g., IDR in 2004)
        const resEdit = await fetch(`${BACKEND_URL}/get-historical-rate?date=${editFormData.date}&currency=${editFormData.editCurrency}`);
        const dataEdit = await resEdit.json();
        
        // 2. Fetch historical rate for the currency being VIEWED (e.g., USD switcher)
        const resLocal = await fetch(`${BACKEND_URL}/get-historical-rate?date=${editFormData.date}&currency=${localCurrency}`);
        const dataLocal = await resLocal.json();
        
        setPreviewRates({
          editRate: dataEdit.rate || 1,
          localRate: dataLocal.rate || 1
        });
      } catch (err) {
        console.error("Preview rate fetch failed", err);
      }
    };
    
    fetchPreviewRates();
  }, [editFormData.date, editFormData.editCurrency, localCurrency, editingTxId]);

  const portfolio = useMemo(() => 
    portfolios?.find(p => String(p.id) === String(portfolioId)) || null,
    [portfolios, portfolioId]
  );

  const asset = useMemo(() => 
    portfolio?.assets?.find(a => String(a.id) === String(assetId)) || null,
    [portfolio, assetId]
  );

  const assetInfo = useMemo(() => {
    if (!asset) return null;
    
    // Try multiple lookup strategies
    const strategies = [
      // 1. Exact match by name
      () => ASSET_LIBRARY.find(a => a.name.toLowerCase() === asset.name.toLowerCase()),
      
      // 2. Exact match by symbol
      () => ASSET_LIBRARY.find(a => a.symbol?.toLowerCase() === asset.symbol?.toLowerCase()),
      
      // 3. Match name without parentheses
      () => {
        const cleanName = asset.name.replace(/\s*\([^)]*\)$/, '').trim();
        return ASSET_LIBRARY.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
      },
      
      // 4. Match symbol in parentheses
      () => {
        const symbolMatch = asset.name.match(/\(([^)]+)\)/);
        if (symbolMatch) {
          const symbol = symbolMatch[1];
          return ASSET_LIBRARY.find(a => a.symbol?.toLowerCase() === symbol.toLowerCase());
        }
        return null;
      },
      
      // 5. Partial name match
      () => ASSET_LIBRARY.find(a => 
        asset.name.toLowerCase().includes(a.name.toLowerCase()) || 
        a.name.toLowerCase().includes(asset.name.toLowerCase())
      ),
      
      // 6. For Bitcoin specifically
      () => {
        const lowerName = asset.name.toLowerCase();
        if (lowerName.includes('bitcoin') || lowerName.includes('btc')) {
          return ASSET_LIBRARY.find(a => a.symbol === 'BTC' || a.name === 'Bitcoin');
        }
        return null;
      }
    ];
    
    // Try each strategy in order
    for (const strategy of strategies) {
      const result = strategy();
      if (result) return result;
    }
    
    return null;
  }, [asset]);

  useEffect(() => {
    const loadData = async () => {
      if (asset?.transactions) {
        setIsLoading(true);
        // Pass 'localCurrency' (the switcher) to the calculation
        const results = await calculateFIFOMetrics(asset.transactions, localCurrency);
        setMetrics(results);
        setDisplayTxs(results.convertedTransactions);
        setIsLoading(false);
      }
    };
    loadData();
  }, [asset, localCurrency]);


  // Now effects that depend on portfolio/asset can be defined AFTER their declarations
  useEffect(() => {
    console.log("AssetHistory Debug:", {
      portfolioId,
      assetId,
      portfolio,
      asset,
      assetName: asset?.name,
      assetSymbol: asset?.symbol,
      assetInfo
    });
    
    if (portfolio && asset) {
      setIsLoading(false);
      setError(null);
    } else if (!portfolio) {
      setError('Portfolio not found');
      setIsLoading(false);
    } else if (!asset) {
      setError('Asset not found');
      setIsLoading(false);
    }
  }, [portfolio, asset, assetInfo, portfolioId, assetId]);

  // Update local currency when prop changes
  useEffect(() => {
    setLocalCurrency(currency);
  }, [currency]);

  // Format value dengan kurs
  const formatValue = useCallback((val, targetCurrency = localCurrency, isAlreadyConverted = false) => {
    // FIX: If isAlreadyConverted is true, we use the value as-is.
    // Otherwise, we assume the input is USD and multiply by the current rate.
    const converted = isAlreadyConverted ? val : val * (rates[targetCurrency] || 1);
    
    const noDecimalCurrencies = ['IDR', 'JPY'];
    const isNoDecimal = noDecimalCurrencies.includes(targetCurrency);
    
    // Dynamic decimals: IDR gets 0, others get 2 (or 5 for small amounts)
    const decimals = isNoDecimal ? 0 : (Math.abs(converted) < 2 ? 5 : 2);
    
    return new Intl.NumberFormat(targetCurrency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency', 
      currency: targetCurrency, 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals
    }).format(isNoDecimal ? Math.round(converted) : converted);
  }, [localCurrency, rates]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Convert price from any currency to USD (base currency)
  const convertToUSD = (price, fromCurrency) => {
    if (!price || !rates[fromCurrency]) return 0;
    return price / rates[fromCurrency];
  };

  // Convert price from USD to any currency
  const convertFromUSD = (priceUSD, toCurrency) => {
    if (!priceUSD || !rates[toCurrency]) return 0;
    return priceUSD * rates[toCurrency];
  };

  // Initialize edit form with transaction data
  const startEditTransaction = (transaction) => {
    setEditFormData({
      type: transaction.type,
      price: transaction.price.toString(), // Use the actual price entered in 2004
      amount: transaction.amount.toString(),
      date: transaction.date,
      editCurrency: transaction.currency || 'USD' // Use the original currency (e.g., IDR)
    });
    setEditingTxId(transaction.id);
  };

  const saveTransactionEdit = async (transactionId) => {
    try {
      const originalPrice = parseFloat(editFormData.price);
      const amount = parseFloat(editFormData.amount);

      // FETCH HISTORICAL RATE FOR THE DATE
      const response = await fetch(
        `${BACKEND_URL}/get-historical-rate?date=${editFormData.date}&currency=${editFormData.editCurrency}`
      );
      const rateData = await response.json();
      const rateAtDate = rateData.rate || 1;

      // Calculate USD value based on historical rate
      const priceUSD = originalPrice / rateAtDate;
      const valueUSD = priceUSD * amount;

      const editData = {
        type: editFormData.type,
        price: originalPrice,
        priceUSD: priceUSD,
        currency: editFormData.editCurrency,
        amount: amount,
        value: valueUSD,
        date: editFormData.date,
        exchangeRate: rateAtDate // Optional: store for record
      };

      const newTxs = asset.transactions.map(t => 
        t.id === transactionId ? { ...t, ...editData } : t
      );
      
      const metrics = await calculateFIFOMetrics(newTxs, 'USD');
      const currentPrice = asset.value / asset.amount;

      setPortfolios(prev => prev.map(p => {
        if (String(p.id) === String(portfolioId)) {
          const newAssets = p.assets.map(a => {
            if (String(a.id) === String(assetId)) {
              return {
                ...a,
                ...metrics,
                value: currentPrice * metrics.amount,
                transactions: newTxs
              };
            }
            return a;
          });
          return { ...p, assets: newAssets };
        }
        return p;
      }));
      setEditingTxId(null);
    } catch (err) {
      console.error("Edit failed:", err);
      alert("Could not save changes. Check backend connection.");
    }
  };

  const removeTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to remove this transaction?')) return;

    // --- STEP 1: CALCULATE NEW DATA OUTSIDE SETSTATE ---
    const newTxs = asset.transactions.filter(t => t.id !== transactionId);
    const currentPrice = asset.value / asset.amount;

    let metrics = null;
    if (newTxs.length > 0) {
      metrics = await calculateFIFOMetrics(newTxs);
    }

    // --- STEP 2: UPDATE STATE ---
    setPortfolios(prev => {
      const updated = prev.map(p => {
        if (String(p.id) === String(portfolioId)) {
          const newAssets = p.assets.map(a => {
            if (String(a.id) === String(assetId)) {
              if (newTxs.length === 0) return null; // Asset will be filtered out below

              return {
                ...a,
                ...metrics,
                value: currentPrice * metrics.amount,
                transactions: newTxs,
                purchaseDate: metrics.firstDate
              };
            }
            return a;
          }).filter(Boolean);
          
          return { ...p, assets: newAssets };
        }
        return p;
      });

      // Handle redirect if asset is gone
      const assetStillExists = updated
        .find(p => String(p.id) === String(portfolioId))
        ?.assets.find(a => String(a.id) === String(assetId));
        
      if (!assetStillExists) {
        navigate(`/portfolio`, { state: { activePortfolioId: Number(portfolioId) } });
      }
      
      return updated;
    });
  };

  const costBasisUSD = useMemo(() => {
    if (!asset || !asset.transactions) return 0;
    return asset.transactions.reduce((acc, tx) => acc + (tx.priceUSD * tx.amount), 0);
  }, [asset]);

  const avgBuyUSD = asset ? calculateAverageBuyPrice(costBasisUSD, asset.amount) : 0;
  // Rename pnlUSD to pnl to fix the "not defined" error
  const pnl = asset ? asset.value - costBasisUSD : 0; 
  const pnlPercent = (asset && costBasisUSD > 0) ? (pnl / costBasisUSD) * 100 : 0;

  // Loading and error states
  if (isLoading) {
    return (
      <div className="pt-10 px-8 max-w-7xl mx-auto pb-32 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D3AC2C] mb-4"></div>
          <p className="text-zinc-400">Loading asset data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10 px-8 max-w-7xl mx-auto pb-32">
        <div className="text-center py-20">
          <p className="text-2xl font-bold text-red-500 mb-4">{error}</p>
          <p className="text-zinc-400 mb-6">The asset you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate(`/portfolio`)}
            className="bg-[#D3AC2C] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#A57A03] transition-all"
          >
            Return to Portfolio
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio || !asset) {
    return (
      <div className="pt-10 px-8 max-w-7xl mx-auto pb-32">
        <div className="text-center py-20">
          <p className="text-2xl font-bold text-red-500 mb-4">Asset Not Found</p>
          <p className="text-zinc-400 mb-6">The asset you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate(`/portfolio`)}
            className="bg-[#D3AC2C] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#A57A03] transition-all"
          >
            Return to Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10 px-8 max-w-7xl mx-auto pb-32">
      <title>History</title>
      {/* HEADER NAVIGATION SECTION - PLACE IT HERE */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={handleBackNavigation}
          className="group flex items-center gap-2 text-zinc-500 hover:text-[#D3AC2C] transition-all"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#D3AC2C]/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </div>
          <span className="font-bold uppercase tracking-widest text-xs">
            Back to {portfolio?.name || 'Portfolio'}
          </span>
        </button>
      </div>

      {/* ASSET MASTER CARD */}
      <div className="aurum-card p-10 rounded-[2.5rem] mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D3AC2C]/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              {/* Icon Asset */}
              <div className="relative">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/10"
                  style={{ backgroundColor: !assetInfo?.icon ? asset.color : 'transparent' }}
                >
                  {assetInfo?.icon ? (
                    <img 
                      src={assetInfo.icon}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-black text-2xl">
                      {asset.name[0]}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-transparent blur-[2px] opacity-30"></div>
              </div>
              
              <h1 className="text-4xl font-black tracking-tighter text-white">{asset.name}</h1>
            </div>
            
          <div className="flex flex-wrap gap-10">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Total Holdings</p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {parseFloat(asset.amount.toFixed(8))} <span className="text-sm text-zinc-600 ml-1">units</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Market Value</p>
              <p className="text-3xl font-bold text-[#D3AC2C] tabular-nums">{formatValue(asset.value)}</p>
            </div>
          </div>
        </div>

          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-w-[240px]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Profit / Loss</p>
            <div className="flex items-end gap-3">
                <span className={`text-4xl font-black tabular-nums ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                </span>
                <span className={`text-sm font-bold mb-1 ${pnl >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {/* Change 'true' to 'false' because pnl is in USD and needs conversion to localCurrency */}
                    {formatValue(pnl, localCurrency, false)} 
                </span>
            </div>
          </div>
          {/* Transaction Summary Card */}
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-w-[240px]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Transaction Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Total Buys:</span>
                <span className="text-green-500 font-bold">
                  {asset.transactions?.filter(t => t.type === 'BUY').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Total Sells:</span>
                <span className="text-red-500 font-bold">
                  {asset.transactions?.filter(t => t.type === 'SELL').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-zinc-400 text-sm">Holding Since</span>
                <span className="text-white text-sm">
                  {formatDate(asset.purchaseDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { 
            label: 'Average Buy Price', 
            val: formatValue(metrics?.avgBuy || 0, localCurrency, true), 
            color: 'text-white' 
          },
          { 
            label: 'Cost Basis', 
            val: formatValue(metrics?.costBasis || 0, localCurrency, true), 
            color: 'text-white' 
          },
          { 
            label: 'Current Price', 
            // Market value is live, so this remains 'false' (it converts USD -> Today's IDR)
            val: formatValue(asset.value / asset.amount, localCurrency, false), 
            color: 'text-[#D3AC2C]' 
          },
          { 
            label: 'Investing Since', 
            val: formatDate(asset.purchaseDate), 
            color: 'text-white' 
          }
        ].map((stat, i) => (
          <div key={i} className="aurum-card p-6 rounded-3xl border border-white/[0.03]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* TRANSACTION HISTORY TABLE */}
      <div className="aurum-card p-8 rounded-[2rem] mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tighter">Transaction History</h2>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1 block">
              {asset.transactions?.length || 0} transactions
            </span>
          </div>
          <div 
            className="relative flex bg-zinc-900/50 p-1 rounded-full border border-white/5 w-fit"
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
                onClick={() => {
                  setCurrency(curr);
                  setLocalCurrency(curr);
                  // Also update edit currency if we're not currently editing
                  if (!editingTxId) {
                    setEditFormData(prev => ({ ...prev, editCurrency: curr }));
                  }
                }}
              >
                <span className={`text-xs font-bold transition-colors duration-200 ${
                  (isHoveringSwitcher ? hoveredCurrency === curr : localCurrency === curr) 
                    ? 'text-black' 
                    : 'text-zinc-500'
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
        
        {asset.transactions && asset.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full tabular-nums">
              <thead className="text-zinc-600 text-[10px] tracking-widest uppercase border-b border-zinc-900">
                <tr>
                  <th className="pb-4 text-center">Date</th>
                  <th className="pb-4 text-center">Type</th>
                  <th className="pb-4 text-center">Price</th>
                  <th className="pb-4 text-center">Amount</th>
                  <th className="pb-4 text-center">Total Value</th>
                  <th className="pb-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-900">
                {displayTxs
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-white/[0.01]">
                      {/* DATE */}
                      <td className="py-6 text-center text-white font-medium">
                        {editingTxId === transaction.id ? (
                          <input
                            type="date"
                            className="bg-black border border-zinc-700 p-2 rounded text-sm text-white w-full max-w-[140px]"
                            value={editFormData.date}
                            onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                          />
                        ) : (
                          formatDate(transaction.date)
                        )}
                      </td>
                      
                      {/* TYPE - EDITABLE */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setEditFormData({...editFormData, type: 'BUY'})}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all tracking-widest
                                ${editFormData.type === 'BUY' 
                                  ? 'bg-[#22C55E] text-black border border-white/5 hover:bg-[#1da84f] active:scale-[0.98] active:bg-[#1a9547]' 
                                  : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:bg-zinc-900/70'
                                }`}
                            >
                              BUY
                            </button>

                            <button
                              onClick={() => setEditFormData({...editFormData, type: 'SELL'})}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all tracking-widest
                                ${editFormData.type === 'SELL' 
                                  ? 'bg-[#EF4444] text-black border border-white/5 hover:bg-[#dc2626] active:scale-[0.98] active:bg-[#c82323]' 
                                  : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:bg-zinc-900/70'
                                }`}
                            >
                              SELL
                            </button>
                          </div>
                        ) : (
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest border border-white/5 ${
                            transaction.type === 'BUY' 
                              ? 'bg-[#22C55E] text-black' 
                              : 'bg-[#EF4444] text-black'
                          }`}>
                            {transaction.type}
                          </span>
                        )}
                      </td>
                      
                      {/* PRICE - Dynamic View Price while Editing */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2">
                              <IncreaseDecrease 
                                value={editFormData.price}
                                setter={(newVal) => setEditFormData({...editFormData, price: newVal})}
                                step={editFormData.editCurrency === 'IDR' ? 1000 : 0.01}
                              />
                              <div className="relative">
                                <select
                                  className="bg-black border border-zinc-700 p-2 rounded text-sm text-white appearance-none pr-8"
                                  value={editFormData.editCurrency}
                                  onChange={(e) => setEditFormData({...editFormData, editCurrency: e.target.value})}
                                >
                                  {['USD', 'CAD', 'IDR'].map((curr) => (
                                    <option key={curr} value={curr}>{curr}</option>
                                  ))}
                                </select>
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                  </svg>
                                </div>
                              </div>
                            </div>
                            {/* Historical Preview Label while editing */}
                            {localCurrency !== editFormData.editCurrency}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[#D3AC2C] font-semibold">
                              {formatValue(transaction.displayPrice, localCurrency, true)}
                            </span>
                            <span className="text-xs text-zinc-500 mt-1">
                              bought at {new Intl.NumberFormat(transaction.currency === 'IDR' ? 'id-ID' : 'en-US', {
                                style: 'currency',
                                currency: transaction.currency || 'USD',
                                minimumFractionDigits: transaction.currency === 'IDR' ? 0 : 2,
                                maximumFractionDigits: transaction.currency === 'IDR' ? 0 : 5
                              }).format(transaction.price)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <input
                            type="number"
                            step="0.00001"
                            className="bg-black border border-zinc-700 p-2 rounded text-sm text-white text-center w-32 mx-auto"
                            value={editFormData.amount}
                            onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {transaction.amount}
                          </span>
                        )}
                      </td>

                      {/* TOTAL VALUE - Uses historical preview while editing */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <div className="flex flex-col">
                            <span className="text-white font-bold">
                              {/* MATH: (Price / EditRate) * Amount * LocalRate */}
                              {formatValue(
                                ((parseFloat(editFormData.price || 0) / (previewRates.editRate || 1)) * parseFloat(editFormData.amount || 0)) * (previewRates.localRate || 1),
                                localCurrency,
                                true
                              )}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                              ({editFormData.date})
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-white font-bold">
                              {formatValue(transaction.displayValue, localCurrency, true)}
                            </span>
                          </div>
                        )}
                      </td>
                      
                      {/* ACTIONS */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <div className="flex flex-col gap-2 items-center">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveTransactionEdit(transaction.id)}
                                className="px-4 py-2 bg-[#22C55E] text-black text-xs font-bold tracking-widest rounded-full 
                                          transition-all hover:bg-[#1da84f] active:scale-[0.98] active:bg-[#1a9547] 
                                          border border-white/5 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTxId(null);
                                  setEditFormData({
                                    type: 'BUY',
                                    price: '',
                                    amount: '',
                                    date: '',
                                    editCurrency: localCurrency
                                  });
                                }}
                                className="px-3 py-2 bg-zinc-300 text-black text-xs font-bold tracking-widest rounded-full 
                                          transition-all hover:bg-zinc-600 active:scale-[0.98] active:bg-zinc-500 
                                          border border-white/5 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="text-[12px] text-zinc-500 mt-1">
                              Editing in {editFormData.editCurrency}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 items-center">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditTransaction(transaction)}
                                className="px-3 py-2 bg-zinc-400 text-black text-xs font-bold tracking-widest rounded-full 
                                          transition-all hover:bg-zinc-600 active:scale-[0.98] active:bg-zinc-500 
                                          border border-white/5 disabled:opacity-50"

                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeTransaction(transaction.id)}
                                className="px-3 py-2 bg-[#EF4444] text-black text-xs font-bold tracking-widest rounded-full 
                                          transition-all hover:bg-[#dc2626] active:scale-[0.98] active:bg-[#c82323] 
                                          border border-white/5 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="text-[12px] text-zinc-500">
                              Click to edit
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-zinc-600 italic text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
            No transaction history recorded yet. Add purchases to see detailed ledger.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetHistory;