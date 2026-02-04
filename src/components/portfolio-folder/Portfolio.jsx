import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

import { db, auth } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

import { ASSET_LIBRARY, searchAssets } from '../../data/assets-data/assetLibrary';
import { fetchCryptoPrice, fetchBatchCryptoPrices, fetchStockPrice } from '../../data/price-api-data/priceService'; 

import PieChartComponent from './PieChart';
import CurrentHoldings from './CurrentHoldings';
import Performance from './Performance';
import AddAsset from './AddAsset';
import UpdatePrice from '../ui-button-folder/UpdatePrice';
import { calculateFIFOMetrics } from '../../data/algo-data/FIFO'
import { getAssetInfo } from '../../data/algo-data/GetAssetInfo';
import { updateAllPrices } from '../../data/price-api-data/priceUpdater';

const Portfolio = ({ portfolios, setPortfolios, assetMasterList, setAssetMasterList, currency, setCurrency, rates }) => {
  const [hoveredCurrency, setHoveredCurrency] = useState(null);
  const [isHoveringSwitcher, setIsHoveringSwitcher] = useState(false);
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [editingColorForAsset, setEditingColorForAsset] = useState(null);
  const [isAddingNewAsset, setIsAddingNewAsset] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const navigate = useNavigate();
  const [activePortfolioId, setActivePortfolioId] = useState(null);

  // New states for real-time features
  const [realTimePrices, setRealTimePrices] = useState({});
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [priceUpdateTime, setPriceUpdateTime] = useState(null);

  const [portfolioSettings, setPortfolioSettings] = useState({});
  const [currentRates, setCurrentRates] = useState(rates);
  const location = useLocation();

  const COLOR_OPTIONS = [
    '#F7931A', '#627EEA', '#004A99', '#003D79', '#D4AF37', 
    '#228B22', '#ED1C24', '#76B900', '#CED4DA', '#C0C0C0'
  ];

  const createDefaultPortfolioIfNeeded = () => {
    if (portfolios.length === 0) {
      const defaultPortfolio = {
        id: Date.now(),
        name: 'Main Portfolio',
        assets: [],
        countInDashboard: true
      };
      setPortfolios([defaultPortfolio]);
      setActivePortfolioId(defaultPortfolio.id);  
    }
  };

  const handlePriceUpdate = async () => {
    if (activePortfolio.assets.length === 0) return;
    
    setIsUpdatingPrices(true);
    try {
      // Now this correctly calls the utility imported from priceUpdater.js
      const newPrices = await updateAllPrices(activePortfolio.assets, currentRates);
      
      setRealTimePrices(newPrices);
      setPriceUpdateTime(new Date().toLocaleTimeString());

      setPortfolios(prev => prev.map(p => {
        if (p.id === activePortfolioId) {
          return {
            ...p,
            assets: p.assets.map(a => ({
              ...a,
              // Calculate new value based on fresh price
              value: (newPrices[a.name] || (a.value / a.amount)) * a.amount
            }))
          };
        }
        return p;
      }));
    } catch (error) {
      console.error("Failed to sync prices:", error);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  useEffect(() => {
    createDefaultPortfolioIfNeeded();
  }, []);

  useEffect(() => {
    console.log('Portfolio Debug:', {
      locationState: location.state,
      activePortfolioId,
      portfoliosCount: portfolios.length,
      portfolioNames: portfolios.map(p => ({ id: p.id, name: p.name }))
    });
    
    // If we have location state from navigation (coming from AssetHistory)
    if (location.state?.activePortfolioId) {
      const incomingId = Number(location.state.activePortfolioId);
      const portfolioExists = portfolios.find(p => p.id === incomingId);
      
      if (portfolioExists) {
        console.log('Setting active portfolio from location state:', incomingId);
        setActivePortfolioId(incomingId);
        // Clear the state so it doesn't interfere with future selections
        navigate(location.pathname, { replace: true, state: {} });
      }
    } 
    // Only set default if we don't already have an active portfolio
    else if (!activePortfolioId && portfolios.length > 0) {
      console.log('Setting default portfolio to first one:', portfolios[0].id);
      setActivePortfolioId(portfolios[0].id);
    }
  }, [location.state, portfolios, navigate]);

  useEffect(() => {
    if (activePortfolioId && portfolios.length > 0) {
      const portfolioExists = portfolios.find(p => p.id === activePortfolioId);
      if (!portfolioExists && portfolios.length > 0) {
        console.log('Active portfolio no longer exists, switching to:', portfolios[0].id);
        setActivePortfolioId(portfolios[0].id);
      }
    }
  }, [portfolios, activePortfolioId]);

  const defaultEmptyPortfolio = {
    id: 1,
    name: 'Main Portfolio',
    assets: []
  };
  
  const activePortfolio = useMemo(() => {
    if (portfolios.length === 0) {
      return defaultEmptyPortfolio;
    }
    
    const found = portfolios.find(p => p.id === activePortfolioId);
    return found || portfolios[0] || defaultEmptyPortfolio;
  }, [portfolios, activePortfolioId]);

  // Filter asset library based on search
  useEffect(() => {
    if (assetSearchQuery.trim() === '') {
      setSearchResults(ASSET_LIBRARY.slice(0, 10));
    } else {
      const results = searchAssets(assetSearchQuery);
      setSearchResults(results);
    }
  }, [assetSearchQuery]);

  
  // Auto-update prices
  useEffect(() => {
    if (activePortfolio.assets.length > 0) {
      handlePriceUpdate(); // Use the new name
      const interval = setInterval(handlePriceUpdate, 30000); // Use the new name
      return () => clearInterval(interval);
    }
  }, [activePortfolio.assets.length, activePortfolioId]);

  // Get current price for an asset
  const getCurrentPrice = (assetName) => {
    // Cek dulu di realTimePrices
    if (realTimePrices[assetName]) {
      return realTimePrices[assetName];
    }
    
    // Fallback ke harga yang tersimpan
    const asset = activePortfolio.assets.find(a => a.name === assetName);
    return asset ? asset.value / asset.amount : 0;
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const [newAsset, setNewAsset] = useState({ 
    name: 'Bitcoin (BTC)', 
    buyPrice: '', 
    amount: '', 
    currency: 'USD', 
    type: 'BUY',
    color: null,
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const confirmNewPortfolio = () => {
    if (newPortfolioName.trim() !== "") {
      const newP = {
        id: Date.now(),
        name: newPortfolioName.trim(),
        assets: [],
        countInDashboard: true
      };
      setPortfolios([...portfolios, newP]);
      setActivePortfolioId(newP.id);
      setNewPortfolioName('');
      setIsAddingPortfolio(false);
    }
  };

  const deletePortfolio = (portfolioId) => {
    if (portfolios.length <= 1) {
      alert('Cannot delete the last portfolio. Create a new one first.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this portfolio? All assets within will be permanently removed.')) return;
    
    const updatedPortfolios = portfolios.filter(p => p.id !== portfolioId);
    setPortfolios(updatedPortfolios);
    
    if (activePortfolioId === portfolioId && updatedPortfolios.length > 0) {
      setActivePortfolioId(updatedPortfolios[0].id);
    }
  };

  const toggleCountInDashboard = (portfolioId) => {
    const updatedPortfolios = portfolios.map(p => 
      p.id === portfolioId 
        ? { ...p, countInDashboard: !p.countInDashboard } 
        : p
    );
    setPortfolios(updatedPortfolios);
  };

  const COLORS = COLOR_OPTIONS;

  const getLocale = useCallback((curr) => (curr === 'IDR' ? 'id-ID' : 'en-US'), []);

  const sortedAssets = useMemo(() => {
    return [...(activePortfolio.assets || [])].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [activePortfolio]);

  const formatValue = useCallback((val, curr) => {
    const converted = val * (currentRates[curr] || 1);
    const noDecimalCurrencies = ['IDR', 'JPY'];

    if (noDecimalCurrencies.includes(curr)) {
      return new Intl.NumberFormat(getLocale(curr), {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.round(converted));
    } else {
      // Untuk USD/CAD - gunakan ABSOLUTE VALUE untuk pengecekan
      const absoluteValue = Math.abs(converted);
      const isSmallValue = absoluteValue < 2;
      const decimals = isSmallValue ? 5 : 2;
      
      return new Intl.NumberFormat(getLocale(curr), {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(converted);
    }
  }, [currentRates, getLocale]);

  const totalValue = useMemo(() => 
    sortedAssets.reduce((acc, item) => acc + item.value, 0), 
    [sortedAssets]
  );

  const pnlData = useMemo(() => {
    const assets = sortedAssets;
    
    const totalCostBasis = assets.reduce((acc, asset) => 
      acc + (asset.avgBuy * asset.amount), 0
    );
    const totalCurrentValue = assets.reduce((acc, asset) => 
      acc + asset.value, 0
    );
    const totalPnL = totalCurrentValue - totalCostBasis;
    const totalReturnPercentage = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    const historicalData = [
      { period: 'Jan', return: 0 },
      { period: 'Feb', return: totalReturnPercentage * 0.3 },
      { period: 'Mar', return: totalReturnPercentage * 0.5 },
      { period: 'Apr', return: totalReturnPercentage * 0.7 },
      { period: 'May', return: totalReturnPercentage * 0.9 },
      { period: 'Jun', return: totalReturnPercentage },
    ];

    return {
      historicalData,
      totalCostBasis,
      totalCurrentValue,
      totalPnL,
      totalReturnPercentage
    };
  }, [sortedAssets]);

  const totalPnL = pnlData.totalPnL || 0;
  const totalCostBasis = pnlData.totalCostBasis || 0;

  // Add new asset to master list
  const addNewAssetToMasterList = () => {
    if (newAssetName.trim() !== "") {
      const newAssetItem = {
        id: Date.now(),
        name: newAssetName.trim(),
        color: newAsset.color
      };
      setAssetMasterList([...assetMasterList, newAssetItem]);
      setNewAsset({ ...newAsset, name: newAssetName.trim() });
      setNewAssetName('');
      setIsAddingNewAsset(false);
    }
  };

  const getAssetColor = (assetName) => {
    // Check if asset exists in master list with color
    const masterAsset = assetMasterList.find(a => a.name === assetName);
    if (masterAsset?.color) return masterAsset.color;
    
    // Check if asset exists in library with color (PENTING: ini harusnya di-check dulu)
    const libraryAsset = ASSET_LIBRARY.find(a => a.name === assetName);
    if (libraryAsset?.color) return libraryAsset.color;
    
    // Default to first color option
    return COLOR_OPTIONS[0];
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    const rawPrice = newAsset.buyPrice.replace(/[^0-9.]/g, '');
    if (!rawPrice || !newAsset.amount || !newAsset.name) return;

    const assetColor = newAsset.color || getAssetColor(newAsset.name);
    const txPriceInOriginalCurrency = parseFloat(rawPrice);
    const exchangeRateAtTransaction = rates[newAsset.currency] || 1;
    const txPriceInUSD = txPriceInOriginalCurrency / exchangeRateAtTransaction;
    const txQty = parseFloat(newAsset.amount);
    const txValueInUSD = txPriceInUSD * txQty;

    const assetInfo = getAssetInfo(newAsset.name);
    const assetName = assetInfo?.name || newAsset.name;

    const currentMarketPrice = assetInfo?.type === 'crypto' 
      ? realTimePrices[assetName] || txPriceInUSD 
      : txPriceInUSD;

    // Use functional update to prevent state overwrites from multiple tabs/intervals
    setPortfolios(prevPortfolios => {
      const updatedPortfolios = JSON.parse(JSON.stringify(prevPortfolios));
      const portfolioIndex = updatedPortfolios.findIndex(p => p.id === activePortfolioId);
      
      if (portfolioIndex === -1) return prevPortfolios;
      
      const portfolio = updatedPortfolios[portfolioIndex];
      const existingAssetIndex = portfolio.assets.findIndex(a => a.name === assetName);

      // Create the new transaction object
      const newTransaction = {
        id: Date.now(),
        date: newAsset.purchaseDate,
        type: newAsset.type,
        price: txPriceInOriginalCurrency,
        priceUSD: txPriceInUSD,
        currency: newAsset.currency,
        exchangeRate: exchangeRateAtTransaction,
        amount: txQty,
        value: txValueInUSD
      };

      if (existingAssetIndex !== -1) {
        const existingAsset = portfolio.assets[existingAssetIndex];
        const updatedTransactions = [...(existingAsset.transactions || []), newTransaction];
        
        // Calculate new metrics using FIFO
        const { costBasis, amount, firstDate } = calculateFIFOMetrics(updatedTransactions);

        if (amount <= 0) {
          // Remove asset if balance hits zero
          portfolio.assets.splice(existingAssetIndex, 1);
        } else {
          portfolio.assets[existingAssetIndex] = {
            ...existingAsset,
            amount: amount,
            value: currentMarketPrice * amount,
            avgBuy: amount > 0 ? costBasis / amount : 0, // Avoid division by zero
            transactions: updatedTransactions,
            color: newAsset.color || existingAsset.color,
            currencyMix: {
              ...(existingAsset.currencyMix || {}),
              [newAsset.currency]: (existingAsset.currencyMix?.[newAsset.currency] || 0) + (newAsset.type === 'BUY' ? txValueInUSD : -txValueInUSD)
            },
            purchaseDate: firstDate || existingAsset.purchaseDate // Add this
          };
        }
      } else if (newAsset.type === 'BUY') {
        // Create new asset entry
        portfolio.assets.push({
          id: Date.now(),
          name: assetName,
          symbol: assetInfo?.symbol || '',
          value: currentMarketPrice * txQty,
          avgBuy: txPriceInUSD,
          amount: txQty,
          color: assetColor,
          purchaseDate: newAsset.purchaseDate,
          transactions: [newTransaction],
          currencyMix: { [newAsset.currency]: txValueInUSD }
        });
      }

      return updatedPortfolios;
    });

    // Reset form
    setNewAsset({ 
      name: 'Bitcoin (BTC)', 
      buyPrice: '', 
      amount: '', 
      currency: 'USD', 
      type: 'BUY',
      color: null,
      purchaseDate: new Date().toISOString().split('T')[0]
    });
  };

  // Update asset color
  const updateAssetColor = (assetName, newColor) => {
    setAssetMasterList(prev => prev.map(asset => 
      asset.name === assetName ? { ...asset, color: newColor } : asset
    ));
    
    setPortfolios(prev => prev.map(p => ({
      ...p,
      assets: p.assets.map(a => 
        a.name === assetName ? { ...a, color: newColor } : a
      )
    })));
    
    setEditingColorForAsset(null);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const costBasis = data.avgBuy * data.amount;
      const pnl = data.value - costBasis;
      const pnlPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      
      return (
        <div className="bg-[#010203] border border-[#D3AC2C] p-4 rounded-xl shadow-2xl min-w-[200px]">
          <p className="text-white text-sm font-bold mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-[#D3AC2C] text-sm tabular-nums">
              <span className="text-zinc-400">Value: </span> {formatValue(data.value, currency)}
            </p>
            <p className="text-[#D3AC2C] text-sm tabular-nums">
              <span className="text-zinc-400">Holdings: </span> 
              {Number(parseFloat(data.amount).toFixed(8))}
            </p>
            <p className={`text-sm tabular-nums font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <span className="text-zinc-400">PnL: </span> 
              {formatValue(pnl, currency)} ({pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pt-10 px-8 max-w-7xl mx-auto pb-32">
      <title>Portfolio</title>
      <header className="mb-8">
        <h1 className="text-5xl font-extrabold tracking-tighter mb-6">
          Asset <span className="gold-text">Allocation</span>
        </h1>

        <div className="flex items-center gap-3 mb-2">
          {!isAddingPortfolio ? (
            <>
              <div className="relative group">
                <select 
                  value={activePortfolioId}
                  onChange={(e) => setActivePortfolioId(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 text-white font-bold py-1.5 px-4 pr-10 rounded-xl appearance-none focus:outline-none focus:border-[#D3AC2C] transition-all cursor-pointer text-sm"
                >
                  {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">
                  ▼
                </div>
              </div>

              <button 
                onClick={() => setIsAddingPortfolio(true)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-2 rounded-lg transition-all"
                title="Add Portfolio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              
              {portfolios.length > 1 && (
                <button 
                  onClick={() => deletePortfolio(activePortfolioId)}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-2 rounded-lg transition-all"
                  title="Delete Portfolio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <input 
                autoFocus
                type="text"
                placeholder="Portfolio Name..."
                className="bg-black border border-[#D3AC2C] text-white text-sm py-1.5 px-4 rounded-xl outline-none w-48"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmNewPortfolio()}
              />
              <button onClick={confirmNewPortfolio} className="text-[#D3AC2C] font-bold text-xs px-2 hover:text-white">Add</button>
              <button onClick={() => setIsAddingPortfolio(false)} className="text-zinc-500 font-bold text-xs px-2">Cancel</button>
            </div>
          )}
        </div>
        
        {/* Portfolio Settings Row */}
        {portfolios.length > 0 && !isAddingPortfolio && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="countInDashboard"
                checked={activePortfolio.countInDashboard !== false}
                onChange={() => toggleCountInDashboard(activePortfolioId)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#D3AC2C] focus:ring-[#D3AC2C] focus:ring-2 focus:ring-offset-0"
              />
              <label htmlFor="countInDashboard" className="text-zinc-400 cursor-pointer">
                Include in Dashboard calculations
              </label>
            </div>
            <span className="text-xs text-zinc-300">
              {activePortfolio.assets?.length || 0} assets • {formatValue(
                activePortfolio.assets?.reduce((sum, a) => sum + (a.value || 0), 0) || 0, 
                currency
              )}
            </span>
          </div>
        )}
      </header>

      {/* PRICE UPDATE STATUS BAR */}
      <UpdatePrice 
        priceUpdateTime={priceUpdateTime}
        updateAllPrices={handlePriceUpdate}
        isUpdatingPrices={isUpdatingPrices}
        assetCount={activePortfolio.assets.length}
      />

      <div className="flex flex-col gap-10 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          <div className="aurum-card p-8 rounded-3xl h-[500px] w-full">
            {sortedAssets.length > 0 ? (
              <PieChartComponent 
                data={sortedAssets}
                activeIndex={activeIndex}
                onPieEnter={onPieEnter}
                onMouseLeave={() => setActiveIndex(-1)}
                currency={currency}
                formatValue={formatValue}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <p className="text-xl font-bold italic tracking-tighter">
                  Welcome, {auth.currentUser?.email?.split('@')[0] || 'User'}!
                </p>
                <p className="text-sm">Start by adding your first asset below.</p>
              </div>
            )}
          </div>
        </div>

        {/* CURRENT HOLDINGS TABLE */}
        <CurrentHoldings 
          activePortfolioName={activePortfolio.name}
          activePortfolioId={activePortfolioId}
          sortedAssets={sortedAssets}
          totalValue={totalValue}
          getCurrentPrice={getCurrentPrice}
          formatValue={formatValue}
          currency={currency}
          setCurrency={setCurrency}
          COLOR_OPTIONS={COLOR_OPTIONS}
          updateAssetColor={updateAssetColor}
          getAssetColor={getAssetColor}
        />

        {/* PERFORMANCE (PnL) TABLE */}
        <Performance 
          sortedAssets={sortedAssets}
          totalPnL={totalPnL}
          totalCostBasis={totalCostBasis}
          currency={currency}
          formatValue={formatValue}
          getAssetInfo={getAssetInfo}
        />
      </div>
      
      {/* ADD ASSET FORM SECTION */}
      <AddAsset
        newAsset={newAsset}
        setNewAsset={setNewAsset}
        handleAddAsset={handleAddAsset}
        isAddingNewAsset={isAddingNewAsset}
        setIsAddingNewAsset={setIsAddingNewAsset}
        newAssetName={newAssetName}
        setNewAssetName={setNewAssetName}
        addNewAssetToMasterList={addNewAssetToMasterList}
        assetSearchQuery={assetSearchQuery}
        setAssetSearchQuery={setAssetSearchQuery}
        searchResults={searchResults}
        getAssetInfo={getAssetInfo}
        ASSET_LIBRARY={ASSET_LIBRARY}
        COLOR_OPTIONS={COLOR_OPTIONS}
      />
    </div>
  );
};

export default Portfolio;