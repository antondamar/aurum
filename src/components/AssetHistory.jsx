// src/components/AssetHistory.jsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ASSET_LIBRARY } from './assetLibrary';

const AssetHistory = ({ portfolios, setPortfolios, currency, setCurrency, rates }) => {
  const { portfolioId, assetId } = useParams();
  const navigate = useNavigate();

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

  // Move portfolio and asset declarations FIRST, before any effects that use them
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
  const formatValue = useCallback((val, targetCurrency = localCurrency) => {
    const converted = val * (rates[targetCurrency] || 1);
    const decimals = targetCurrency === 'IDR' ? 0 : (converted < 1 ? 5 : 2);
    return new Intl.NumberFormat(targetCurrency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency', 
      currency: targetCurrency, 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals
    }).format(converted);
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
    // Convert transaction price to selected edit currency
    const priceInEditCurrency = convertFromUSD(transaction.price, editFormData.editCurrency);
    
    setEditFormData({
      type: transaction.type,
      price: priceInEditCurrency.toFixed(5),
      amount: transaction.amount.toString(),
      date: transaction.date,
      editCurrency: editFormData.editCurrency // Keep current edit currency
    });
    setEditingTxId(transaction.id);
  };

  // Fungsi untuk mengedit transaksi
  const saveTransactionEdit = (transactionId) => {
    if (!editFormData.date || !editFormData.price || !editFormData.amount || !editFormData.type) {
      alert('Please fill all required fields');
      return;
    }

    // Convert price from edit currency to USD (base currency)
    const priceUSD = convertToUSD(parseFloat(editFormData.price), editFormData.editCurrency);
    const amount = parseFloat(editFormData.amount);
    const valueUSD = priceUSD * amount;

    const updatedPortfolios = portfolios.map(p => {
      if (p.id === parseInt(portfolioId)) {
        const updatedAssets = p.assets.map(a => {
          if (a.id === parseInt(assetId)) {
            // Update transaction
            const newTransactions = a.transactions.map(t => 
              t.id === transactionId ? { 
                ...t, 
                type: editFormData.type,
                price: priceUSD,
                amount: amount,
                value: valueUSD,
                date: editFormData.date
              } : t
            );

            // Re-kalkulasi metrics aset
            const buyTxs = newTransactions.filter(t => t.type === 'BUY');
            const sellTxs = newTransactions.filter(t => t.type === 'SELL');
            const netAmount = buyTxs.reduce((s, t) => s + t.amount, 0) - sellTxs.reduce((s, t) => s + t.amount, 0);
            const totalCost = buyTxs.reduce((s, t) => s + t.value, 0);
            const newAvgBuy = buyTxs.length > 0 ? totalCost / buyTxs.reduce((s, t) => s + t.amount, 0) : 0;
            
            // Dapatkan tanggal pembelian pertama
            const sortedDates = newTransactions
              .filter(t => t.type === 'BUY')
              .map(t => t.date)
              .sort((a, b) => new Date(a) - new Date(b));
            
            return { 
              ...a, 
              amount: netAmount, 
              avgBuy: newAvgBuy, 
              value: a.value, // Nilai akan di-update berdasarkan harga real-time nanti
              purchaseDate: sortedDates[0] || a.purchaseDate,
              transactions: newTransactions 
            };
          }
          return a;
        });
        return { ...p, assets: updatedAssets };
      }
      return p;
    });
    
    setPortfolios(updatedPortfolios);
    setEditingTxId(null);
    setEditFormData({
      type: 'BUY',
      price: '',
      amount: '',
      date: '',
      editCurrency: 'USD'
    });
  };

  const removeTransaction = (transactionId) => {
    if (!window.confirm('Are you sure you want to remove this transaction?')) return;
    
    const updatedPortfolios = portfolios.map(p => {
      if (p.id === parseInt(portfolioId)) {
        const updatedAssets = p.assets.map(a => {
          if (a.id === parseInt(assetId)) {
            // Filter out the transaction
            const updatedTransactions = a.transactions.filter(t => t.id !== transactionId);
            
            if (updatedTransactions.length === 0) {
              return null;
            }
            
            // Hitung ulang metrics
            const buyTransactions = updatedTransactions.filter(t => t.type === 'BUY');
            const sellTransactions = updatedTransactions.filter(t => t.type === 'SELL');
            
            const totalBuyAmount = buyTransactions.reduce((sum, t) => sum + t.amount, 0);
            const totalSellAmount = sellTransactions.reduce((sum, t) => sum + t.amount, 0);
            const netAmount = totalBuyAmount - totalSellAmount;
            
            const totalCost = buyTransactions.reduce((sum, t) => sum + t.value, 0);
            const avgBuy = totalBuyAmount > 0 ? totalCost / totalBuyAmount : 0;
            
            // Ambil harga terkini (dari aset atau harga real-time)
            const currentPrice = a.value / a.amount;
            
            // Dapatkan tanggal pembelian pertama
            const sortedDates = buyTransactions
              .map(t => t.date)
              .sort((a, b) => new Date(a) - new Date(b));
            
            return {
              ...a,
              amount: netAmount,
              avgBuy: avgBuy,
              value: currentPrice * netAmount,
              transactions: updatedTransactions,
              purchaseDate: sortedDates[0] || a.purchaseDate
            };
          }
          return a;
        }).filter(Boolean);
        
        return { ...p, assets: updatedAssets };
      }
      return p;
    });
    
    setPortfolios(updatedPortfolios);
    
    // Jika asset dihapus, redirect ke portfolio
    const updatedAsset = updatedPortfolios
      .find(p => p.id === parseInt(portfolioId))
      ?.assets.find(a => a.id === parseInt(assetId));
      
    if (!updatedAsset) {
      navigate(`/portfolio/${portfolioId}`);
    }
  };

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

  // Hitung PnL untuk header
  const costBasis = asset.avgBuy * asset.amount;
  const pnl = asset.value - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return (
    <div className="pt-10 px-8 max-w-7xl mx-auto pb-32">
      <title>History</title>
      {/* Header Navigasi */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={() => navigate(`/portfolio/${portfolioId}`)}
          className="group flex items-center gap-2 text-zinc-500 hover:text-[#D3AC2C] transition-all"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#D3AC2C]/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </div>
          <span className="font-bold uppercase tracking-widest text-xs">Back to {portfolio.name}</span>
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
                      alt={asset.name} 
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
              <p className="text-3xl font-bold text-white tabular-nums">{asset.amount} <span className="text-sm text-zinc-600 ml-1">units</span></p>
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
                    {formatValue(pnl)}
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
                <span className="text-zinc-400 text-sm">First Purchase:</span>
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
          { label: 'Average Buy Price', val: formatValue(asset.avgBuy), color: 'text-white' },
          { label: 'Cost Basis', val: formatValue(costBasis), color: 'text-white' },
          { label: 'Current Price', val: formatValue(asset.value / asset.amount), color: 'text-[#D3AC2C]' },
          { label: 'Purchase Date', val: formatDate(asset.purchaseDate), color: 'text-white' },
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
                {(asset.transactions ? [...asset.transactions] : [])
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
                            {/* METALLIC GREEN BUY BUTTON */}
                            <button
                              onClick={() => setEditFormData({...editFormData, type: 'BUY'})}
                              className={`px-4 py-1.5 rounded-full text-[12px] font-black transition-all relative overflow-hidden tracking-widest
                                ${editFormData.type === 'BUY' 
                                  ? 'bg-gradient-to-br from-[#4ADE80] via-[#22C55E] to-[#15803D] text-black shadow-lg shadow-green-500/20 border border-[#4ADE80]/30 active:scale-[0.95]' 
                                  : 'bg-green-500/10 text-green-500/40 hover:bg-green-500/20'
                                }
                                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                                before:via-white/30 before:to-transparent before:translate-x-[-100%] 
                                hover:before:translate-x-[100%] before:transition-transform before:duration-700`}
                            >
                              BUY
                            </button>

                            {/* METALLIC RED SELL BUTTON */}
                            <button
                              onClick={() => setEditFormData({...editFormData, type: 'SELL'})}
                              className={`px-4 py-1.5 rounded-full text-[12px] font-black transition-all relative overflow-hidden tracking-widest
                                ${editFormData.type === 'SELL' 
                                  ? 'bg-gradient-to-br from-[#F87171] via-[#EF4444] to-[#B91C1C] text-black shadow-lg shadow-red-500/20 border border-[#F87171]/30 active:scale-[0.95]' 
                                  : 'bg-red-500/10 text-red-500/40 hover:bg-red-500/20'
                                }
                                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                                before:via-white/30 before:to-transparent before:translate-x-[-100%] 
                                hover:before:translate-x-[100%] before:transition-transform before:duration-700`}
                            >
                              SELL
                            </button>
                          </div>
                        ) : (
                          <span className={`px-4 py-1.5 rounded-full text-[12px] font-black tracking-widest border shadow-sm ${
                            transaction.type === 'BUY' 
                              ? 'bg-gradient-to-br from-[#4ADE80] via-[#22C55E] to-[#15803D] text-black border-[#4ADE80]/30 shadow-green-500/10' 
                              : 'bg-gradient-to-br from-[#F87171] via-[#EF4444] to-[#B91C1C] text-black border-[#F87171]/30 shadow-red-500/10'
                          }`}>
                            {transaction.type}
                          </span> 
                        )}
                      </td>
                      
                      {/* PRICE - EDITABLE WITH CURRENCY */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <div className="flex flex-col gap-2 items-center">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.00001"
                                className="bg-black border border-zinc-700 p-2 rounded text-sm text-[#D3AC2C] text-center w-32"
                                value={editFormData.price}
                                onChange={(e) => setEditFormData({...editFormData, price: e.target.value})}
                              />
                              <select
                                className="bg-black border border-zinc-700 p-2 rounded text-xs text-white"
                                value={editFormData.editCurrency}
                                onChange={(e) => {
                                  // Convert price when changing currency
                                  const oldPrice = parseFloat(editFormData.price) || 0;
                                  const oldCurrency = editFormData.editCurrency;
                                  const newCurrency = e.target.value;
                                  
                                  // Convert from old currency to USD, then to new currency
                                  const priceUSD = convertToUSD(oldPrice, oldCurrency);
                                  const priceInNewCurrency = convertFromUSD(priceUSD, newCurrency);
                                  
                                  setEditFormData({
                                    ...editFormData,
                                    editCurrency: newCurrency,
                                    price: priceInNewCurrency.toFixed(5)
                                  });
                                }}
                              >
                                <option value="USD">USD</option>
                                <option value="CAD">CAD</option>
                                <option value="IDR">IDR</option>
                              </select>
                            </div>
                            <div className="text-xs text-zinc-500">
                              ≈ {formatValue(convertToUSD(parseFloat(editFormData.price) || 0, editFormData.editCurrency), 'USD')}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[#D3AC2C] font-semibold">
                              {formatValue(transaction.price)}
                            </span>
                            <span className="text-xs text-zinc-500 mt-1">
                              ≈ {formatValue(transaction.price, 'USD')}
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
                      
                      {/* TOTAL VALUE */}
                      <td className="py-6 text-center">
                        <div className="flex flex-col">
                          <span className="text-white font-bold">
                            {formatValue(transaction.value)}
                          </span>
                          <span className="text-xs text-zinc-500 mt-1">
                            ≈ {formatValue(transaction.value, 'USD')}
                          </span>
                        </div>
                      </td>
                      
                      {/* ACTIONS */}
                      <td className="py-6 text-center">
                        {editingTxId === transaction.id ? (
                          <div className="flex flex-col gap-2 items-center">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveTransactionEdit(transaction.id)}
                                className="relative overflow-hidden px-4 py-2 bg-gradient-to-br from-[#4ADE80] via-[#22C55E] to-[#15803D] 
                                          text-black text-[12px] font-black tracking-widest rounded-lg transition-all 
                                          hover:brightness-110 active:scale-[0.95] shadow-lg shadow-green-500/20 border border-[#4ADE80]/30
                                          before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                                          before:via-white/30 before:to-transparent before:translate-x-[-100%] 
                                          hover:before:translate-x-[100%] before:transition-transform before:duration-700
                                          after:absolute after:inset-0 after:bg-gradient-to-t after:from-white/10 after:via-transparent after:to-white/5"
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
                                className="relative overflow-hidden px-3 py-2 bg-gradient-to-br from-[#718096] via-[#CBD5E0] to-[#4A5568] 
                                          text-black text-[12px] font-black tracking-widest rounded-lg transition-all 
                                          hover:brightness-110 active:scale-[0.95] shadow-lg shadow-gray-500/20 border border-gray-400/30
                                          before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                                          before:via-white/40 before:to-transparent before:translate-x-[-100%] 
                                          hover:before:translate-x-[100%] before:transition-transform before:duration-700
                                          after:absolute after:inset-0 after:bg-gradient-to-t after:from-white/20 after:via-transparent after:to-white/10"
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
                                className="relative overflow-hidden px-3 py-2 bg-gradient-to-br from-[#718096] via-[#CBD5E0] to-[#4A5568] 
                                          text-black text-[12px] font-black tracking-widest rounded-lg transition-all 
                                          hover:brightness-110 active:scale-[0.95] shadow-lg shadow-gray-500/20 border border-gray-400/30
                                          before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                                          before:via-white/40 before:to-transparent before:translate-x-[-100%] 
                                          hover:before:translate-x-[100%] before:transition-transform before:duration-700
                                          after:absolute after:inset-0 after:bg-gradient-to-t after:from-white/20 after:via-transparent after:to-white/10"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeTransaction(transaction.id)}
                                className="relative overflow-hidden px-3 py-2 bg-gradient-to-br from-[#B91C1C] via-[#EF4444] to-[#7F1D1D] 
                                          text-black text-[12px] font-black tracking-widest rounded-lg transition-all 
                                          hover:brightness-110 active:scale-[0.95] shadow-lg shadow-red-900/40 border border-red-700/50
                                          before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                                          before:via-white/20 before:to-transparent before:translate-x-[-100%] 
                                          hover:before:translate-x-[100%] before:transition-transform before:duration-700
                                          after:absolute after:inset-0 after:bg-gradient-to-t after:from-white/10 after:via-transparent after:to-white/5"
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