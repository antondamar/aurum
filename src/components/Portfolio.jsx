import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';

import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

// Import asset library and price service
import { ASSET_LIBRARY, searchAssets } from './assetLibrary';
import { fetchCryptoPrice, fetchBatchCryptoPrices, fetchStockPrice } from './priceService'; 

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
  const location = useLocation();
  const calculateFIFOMetrics = useCallback((transactions) => {
    if (!transactions || transactions.length === 0) return { costBasis: 0, amount: 0, realizedPnL: 0 };

    // Sort transactions by date (oldest first)
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let buyLots = []; // To track remaining quantities of each buy
    let totalRealizedPnL = 0;

    sortedTxs.forEach(tx => {
      if (tx.type === 'BUY') {
        buyLots.push({
          remainingAmount: tx.amount,
          priceUSD: tx.priceUSD,
          originalAmount: tx.amount // Keep track of original for reference
        });
      } else if (tx.type === 'SELL') {
        let amountToSell = tx.amount;
        const sellValueUSD = tx.value; // This should be priceUSD * amount
        
        while (amountToSell > 0 && buyLots.length > 0) {
          const lot = buyLots[0];
          const sellFromThisLot = Math.min(amountToSell, lot.remainingAmount);
          
          // Calculate PnL for this portion
          const costOfThisPortion = sellFromThisLot * lot.priceUSD;
          const proceedsOfThisPortion = (sellValueUSD / tx.amount) * sellFromThisLot;
          totalRealizedPnL += (proceedsOfThisPortion - costOfThisPortion);
          
          lot.remainingAmount -= sellFromThisLot;
          amountToSell -= sellFromThisLot;

          if (lot.remainingAmount <= 0) buyLots.shift();
        }
      }
    });

    // The cost basis of REMAINING holdings is the sum of (remaining amount * original buy price)
    const remainingCostBasis = buyLots.reduce((sum, lot) => sum + (lot.remainingAmount * lot.priceUSD), 0);
    const remainingAmount = buyLots.reduce((sum, lot) => sum + lot.remainingAmount, 0);

    return { 
      costBasis: remainingCostBasis, 
      amount: remainingAmount, 
      realizedPnL: totalRealizedPnL 
    };
  }, []);

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

  // Get asset info from library
  const getAssetInfo = (assetName, assetSymbol) => {
    console.log(`🔍 Looking up asset: "${assetName}", symbol: "${assetSymbol}"`);
    
    // Priority 1: Use symbol if available
    if (assetSymbol) {
      const bySymbol = ASSET_LIBRARY.find(a => a.symbol === assetSymbol);
      if (bySymbol) {
        console.log(`✅ Found by symbol: ${bySymbol.name}`);
        return bySymbol;
      }
    }
    
    // Priority 2: Try to extract symbol from name
    const symbolMatch = assetName.match(/\(([^)]+)\)/);
    if (symbolMatch) {
      const extractedSymbol = symbolMatch[1];
      const assetBySymbol = ASSET_LIBRARY.find(a => a.symbol === extractedSymbol);
      if (assetBySymbol) {
        console.log(`✅ Found by extracted symbol: ${assetBySymbol.name}`);
        return assetBySymbol;
      }
    }
    
    // Priority 3: Clean name (remove parentheses and trim)
    const cleanName = assetName.replace(/\s*\([^)]*\)$/, '').trim();
    console.log(`🔍 Trying clean name: "${cleanName}"`);
    
    // Try exact match first
    const exactMatch = ASSET_LIBRARY.find(a => a.name === cleanName);
    if (exactMatch) {
      console.log(`✅ Exact match found: ${exactMatch.name}`);
      return exactMatch;
    }
    
    // Priority 4: Case-insensitive partial match
    const lowerCleanName = cleanName.toLowerCase();
    const partialMatch = ASSET_LIBRARY.find(a => 
      a.name.toLowerCase().includes(lowerCleanName) ||
      lowerCleanName.includes(a.name.toLowerCase())
    );
    
    if (partialMatch) {
      console.log(`✅ Partial match found: ${partialMatch.name}`);
      return partialMatch;
    }
    
    console.log(`❌ No match found for: "${assetName}"`);
    
    // Return a default object for unknown assets
    return {
      name: cleanName,
      symbol: symbolMatch ? symbolMatch[1] : '',
      type: 'custom',
      category: 'Custom Asset',
      description: 'Custom asset not in library'
    };
  };

  const removeAsset = (assetId) => {
    if (!window.confirm('Are you sure you want to remove this asset and all its transactions?')) return;
    
    const updatedPortfolios = portfolios.map(p => {
      if (p.id === activePortfolioId) {
        return {
          ...p,
          assets: p.assets.filter(a => a.id !== assetId)
        };
      }
      return p;
    });
    
    setPortfolios(updatedPortfolios);
  };

  // Fetch real-time prices for all assets in portfolio
  // Portfolio.jsx - di dalam updateAllPrices function (sekitar line 96-150)
  const updateAllPrices = async () => {
    if (activePortfolio.assets.length === 0) return;
    
    setIsUpdatingPrices(true);
    try {
      // Fetch fresh exchange rates EVERY TIME
      let freshRates = {};
      try {
        const ratesResponse = await fetch('https://open.er-api.com/v6/latest/USD');
        const ratesData = await ratesResponse.json();
        freshRates = ratesData.rates || {};
        console.log('💱 Fresh exchange rates fetched:', freshRates);
      } catch (rateError) {
        console.error('Error fetching exchange rates:', rateError);
        freshRates = rates; // Fall back to existing rates
      }

      const cryptoAssets = activePortfolio.assets.filter(asset => {
        const info = getAssetInfo(asset.name, asset.symbol);
        return info && info.type === 'crypto' && info.coingeckoId;
      });

      const stockAssets = activePortfolio.assets.filter(asset => {
        const info = getAssetInfo(asset.name);
        return info && info.type === 'stock';
      });

      const cashAssets = activePortfolio.assets.filter(asset => {
        const info = getAssetInfo(asset.name);
        return info && info.type === 'cash';
      });

      const newPrices = { ...realTimePrices };
      
      // 1. Update Cryptocurrencies
      if (cryptoAssets.length > 0) {
        const coingeckoIds = cryptoAssets
          .map(asset => getAssetInfo(asset.name)?.coingeckoId)
          .filter(id => id);

        const prices = await fetchBatchCryptoPrices(coingeckoIds);
        
        cryptoAssets.forEach(asset => {
          const info = getAssetInfo(asset.name);
          if (info?.coingeckoId && prices[info.coingeckoId]) {
            newPrices[asset.name] = prices[info.coingeckoId];
          }
        });
      }

      // 2. Update Stocks - PASS FRESH RATES
      if (stockAssets.length > 0) {
        const stockPricePromises = stockAssets.map(async (asset) => {
          const info = getAssetInfo(asset.name);
          
          if (!info?.symbol) {
            console.error(`❌ Symbol not found for asset: ${asset.name}`);
            return null;
          }
          
          try {
            console.log(`📊 Fetching stock price for ${asset.name} (${info.symbol})...`);
            
            // Use fresh IDR rate if available, otherwise fallback
            const idrRate = freshRates?.IDR || rates?.IDR || 15600;
            const price = await fetchStockPrice(info.symbol, idrRate);
            
            console.log(`💰 Got price in USD for ${asset.name}: ${price}`);
            
            if (price > 0) {
              return { assetName: asset.name, price };
            } else {
              const fallbackPrice = asset.value / asset.amount;
              console.log(`Using fallback price: ${fallbackPrice}`);
              return { assetName: asset.name, price: fallbackPrice };
            }
          } catch (error) {
            console.error(`❌ Error fetching price for ${asset.name}:`, error);
            const fallbackPrice = asset.value / asset.amount;
            return { assetName: asset.name, price: fallbackPrice };
          }
        });

        const stockPrices = await Promise.all(stockPricePromises);
        
        stockPrices.forEach(result => {
          if (result && result.price > 0) {
            newPrices[result.assetName] = result.price;
          }
        });
      }

      // 3. Update Cash/Forex Currencies - USING FRESH RATES
      if (cashAssets.length > 0) {
        cashAssets.forEach(asset => {
          const info = getAssetInfo(asset.name);
          const currencySymbol = info?.symbol || 
                                (asset.name.match(/\(([^)]+)\)/) || [])[1];
          
          console.log(`💱 Processing forex: ${asset.name}, symbol: ${currencySymbol}`);
          console.log(`💱 Fresh rates available:`, Object.keys(freshRates));
          
          if (currencySymbol && freshRates[currencySymbol]) {
            // For forex: 1 unit of foreign currency in USD = 1 / exchange rate
            // Example: 1 IDR in USD = 1 / 15600 = 0.000064 USD
            const exchangeRate = freshRates[currencySymbol];
            newPrices[asset.name] = 1 / exchangeRate;
            console.log(`✅ Set price for ${asset.name}: 1 ${currencySymbol} = ${1/exchangeRate} USD`);
          } else if (currencySymbol === 'USD') {
            newPrices[asset.name] = 1; // 1 USD = 1 USD
            console.log(`✅ Set price for USD: 1 USD = 1 USD`);
          } else {
            console.warn(`⚠️ No exchange rate found for ${currencySymbol}`);
            console.log(`Available rates:`, Object.keys(freshRates));
            // Use existing calculation
            newPrices[asset.name] = asset.value / asset.amount;
          }
        });
      }

      // Update state with new prices
      setRealTimePrices(newPrices);

      // In the updateAllPrices function, around line 195-215, update this section:
    setPortfolios(prevPortfolios => {
      return prevPortfolios.map(p => {
        if (p.id === activePortfolioId) {
          return {
            ...p,
            assets: p.assets.map(a => {
              const livePrice = newPrices[a.name];
              if (livePrice) {
                // CRITICAL: Preserve existing properties, only update value
                return { 
                  ...a, 
                  value: livePrice * a.amount,
                  // Ensure we don't lose other properties like transactions
                  transactions: a.transactions || [],
                  currencyMix: a.currencyMix || {}
                };
              }
              return a;
            })
          };
        }
        return p;
      });
    });

      setPriceUpdateTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  
  // Auto-update prices every 30 seconds
  useEffect(() => {
    if (activePortfolio.assets.length > 0) {
      updateAllPrices();
      const interval = setInterval(updateAllPrices, 30000);
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
    const converted = val * (rates[curr] || 1);
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
  }, [rates, getLocale]);

  const formatPercentage = useCallback((val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(val / 100);
  }, []);

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

  // Handle asset selection from dropdown
  const handleAssetSelect = (selectedName) => {
    if (selectedName === "new-asset") {
      setIsAddingNewAsset(true);
      return;
    }
    
    const assetInfo = getAssetInfo(selectedName);
    
    // Always use the standardized name from the asset library
    const standardizedName = assetInfo?.name || selectedName;
    
    setNewAsset({ 
      ...newAsset, 
      name: standardizedName,  // Use standardized name
      color: assetInfo?.color || getAssetColor(selectedName)
    });
  };

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

  const getCurrencyBreakdown = (asset) => {
    if (!asset.currencyMix) return null;
    
    const totalValue = asset.value || (asset.avgBuy * asset.amount);
    const currencies = Object.entries(asset.currencyMix)
      .map(([currency, value]) => ({
        currency,
        percentage: (value / totalValue) * 100,
        value
      }))
      .filter(item => item.percentage > 1); // Only show currencies with >1% allocation
    
    return currencies;
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

  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, fill, name } = props;
    const RADIAN = Math.PI / 180;
    
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    
      const labelRadius = outerRadius + 30;
      const mx = cx + labelRadius * cos;
      const my = cy + labelRadius * sin;
      
      const ex = mx + (cos >= 0 ? 1 : -1) * 35;
      const ey = my;
    
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#fff" dominantBaseline="central" className="text-xs" style={{ fontSize: '11px' }}>
          {name}
        </text>
      </g>
    );
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

      {/* Price Update Status Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-xs text-zinc-500">
          {priceUpdateTime ? (
            <span>Prices updated: {priceUpdateTime}</span>
          ) : (
            <span>Click "Update Prices" to fetch latest prices</span>
          )}
        </div>
        <button
          onClick={updateAllPrices}
          disabled={isUpdatingPrices || activePortfolio.assets.length === 0}
          className="relative overflow-hidden bg-gradient-to-br from-[#F9E08B] via-[#D3AC2C] to-[#A57A03] 
             text-black text-xs font-bold px-4 py-2 rounded-lg transition-all 
             disabled:opacity-50 flex items-center gap-2 hover:brightness-110 
             active:scale-[0.98] shadow-lg shadow-[#D3AC2C]/20 border border-[#F9E08B]/30
             before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
             before:via-white/20 before:to-transparent before:translate-x-[-100%] 
             hover:before:translate-x-[100%] before:transition-transform before:duration-700"
        >
          {isUpdatingPrices ? (
            <>
              <div className="w-2 h-2 bg-[#D3AC2C] rounded-full animate-pulse"></div>
              Updating...
            </>
          ) : (
            '↻ Update Prices'
          )}
        </button>
      </div>

      <div className="flex flex-col gap-10 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          <div className="aurum-card p-8 rounded-3xl h-[500px] w-full">
            {sortedAssets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={(props) => {
                      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                      return (
                        <g>
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius + 10} 
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                          />
                        </g>
                      );
                    }}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={() => setActiveIndex(-1)}
                    data={sortedAssets}
                    innerRadius={0} 
                    outerRadius={130} 
                    paddingAngle={0} 
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={{ stroke: '#ffffff', strokeWidth: 1 }}
                    isAnimationActive={false}
                  >
                    {sortedAssets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <p className="text-xl font-bold italic tracking-tighter">Welcome, {auth.currentUser?.email?.split('@')[0] || 'User'}!</p>
                <p className="text-sm">Start by adding your first asset below.</p>
              </div>
            )}
          </div>
        </div>

        {/* CURRENT HOLDINGS TABLE */}
        <div className="aurum-card p-8 rounded-3xl w-full">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-sm text-zinc-500 tracking-widest uppercase">
              {activePortfolio.name} <span className="text-zinc-700 ml-2">/ Current Holdings</span>
            </h3>
            
            <div 
              className="relative flex bg-zinc-900/50 p-1 rounded-full border border-white/5"
              onMouseEnter={() => setIsHoveringSwitcher(true)}
              onMouseLeave={() => {
                setIsHoveringSwitcher(false);
                setHoveredCurrency(null);
              }}
            >
              {['USD', 'CAD', 'IDR'].map((curr) => (
                <div key={curr} className="relative px-6 py-2 cursor-pointer z-10" onMouseEnter={() => setHoveredCurrency(curr)} onClick={() => setCurrency(curr)}>
                  <span className={`text-xs font-bold transition-colors duration-200 ${ (isHoveringSwitcher ? hoveredCurrency === curr : currency === curr) ? 'text-black' : 'text-zinc-500' }`}>
                    {curr}
                  </span>
                </div>
              ))}
              <motion.div
                className="absolute inset-y-1 bg-[#D3AC2C] rounded-full z-0"
                animate={{ 
                  x: `${['USD', 'CAD', 'IDR'].indexOf(isHoveringSwitcher && hoveredCurrency ? hoveredCurrency : currency) * 100}%` 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ width: '33.33%' }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center tabular-nums border-collapse">
            <thead className="text-zinc-600 text-[10px] tracking-widest uppercase border-b border-zinc-900">
              <tr>
                <th className="pb-4 w-1/6">Asset</th>
                <th className="pb-4 w-1/12">Color</th>
                <th className="pb-4 w-1/6">Allocation</th>
                <th className="pb-4 w-1/6">Holdings</th>
                <th className="pb-4 w-1/6">Current Price</th>
                <th className="pb-4 w-1/6">Market Value</th>
                <th className="pb-4 w-1/6">Avg Buy Price</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-900">
              {sortedAssets.length > 0 ? (
                sortedAssets.map((item) => {
                  const allocation = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                  const currentPrice = getCurrentPrice(item.name);
                  
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => navigate(`/portfolio/${activePortfolioId}/asset/${item.id}`)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Asset Name */}
                      <td className="py-6 font-medium text-white group-hover:text-[#D3AC2C] transition-colors">
                        {item.name}
                      </td>

                      {/* Color Picker Column */}
                      <td className="py-6">
                        <div className="relative flex justify-center">
                          <button
                            className="w-6 h-6 rounded-full border-2 border-white/20"
                            style={{ backgroundColor: item.color || getAssetColor(item.name) }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingColorForAsset(editingColorForAsset === item.name ? null : item.name);
                            }}
                          />
                          {editingColorForAsset === item.name && (
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[250px]" onClick={e => e.stopPropagation()}>
                              <div className="grid grid-cols-5 gap-2">
                                {COLOR_OPTIONS.map(color => (
                                  <button
                                    key={color}
                                    className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white transition-all"
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateAssetColor(item.name, color)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Allocation Percentage */}
                      <td className="py-6 text-zinc-400 font-bold">{allocation.toFixed(1)}%</td>

                      {/* Holdings Amount */}
                      <td className="py-6 text-white font-bold">
                        {Number(parseFloat(item.amount).toFixed(8))}
                      </td>

                      {/* Current Market Price */}
                      <td className="py-6 text-[#D3AC2C] font-bold">{formatValue(currentPrice, currency)}</td>

                      {/* Total Market Value */}
                      <td className="py-6 text-white font-bold">{formatValue(item.value, currency)}</td>

                      {/* Average Buy Price */}
                      <td className="py-6 text-zinc-500">{formatValue(item.avgBuy, currency)}</td>
                    
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-zinc-500">
                    <p className="text-lg italic tracking-tighter">No assets found in this portfolio.</p>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>

        {/* PnL TABLE */}
        <div className="aurum-card p-8 rounded-3xl w-full">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-sm text-zinc-500 tracking-widest uppercase">
              Profit & Loss <span className="text-zinc-700 ml-2">/ Performance</span>
            </h3>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total PnL</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatValue(totalPnL, currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total Cost Basis</p>
                <p className="text-2xl font-bold text-white">
                  {formatValue(totalCostBasis, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center tabular-nums border-collapse">
              <thead className="text-zinc-600 text-[10px] tracking-widest uppercase border-b border-zinc-900">
                <tr>
                  <th className="pb-4 w-1/6 text-left pl-6">Asset</th>
                  <th className="pb-4 w-1/6">PnL</th>
                  <th className="pb-4 w-1/6">PnL %</th>
                  <th className="pb-4 w-1/6">Cost Basis</th>
                  <th className="pb-4 w-1/6">Current Value</th>
                  <th className="pb-4 w/6">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {sortedAssets.length > 0 ? (
                  sortedAssets.map((asset) => {
                    const costBasis = asset.avgBuy * asset.amount;
                    const currentValue = asset.value;
                    const pnl = currentValue - costBasis;
                    const pnlPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                    
                    return (
                      <tr key={asset.id} className="hover:bg-white/[0.01]">
                        <td className="py-6 pl-6 text-left">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: asset.color }}
                            />
                            <div>
                              <span className="font-medium text-white">{asset.name}</span>
                              {getAssetInfo(asset.name)?.type === 'crypto' && (
                                <span className="text-xs text-[#D3AC2C] ml-2">● Live</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`py-6 font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatValue(pnl, currency)}
                        </td>
                        <td className={`py-6 font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                        </td>
                        <td className="py-6 text-zinc-400">{formatValue(costBasis, currency)}</td>
                        <td className="py-6 text-white">{formatValue(currentValue, currency)}</td>
                        <td className="py-6">
                          <div className="flex flex-col items-center">
                            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(Math.abs(pnlPercentage), 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs mt-1 ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {pnl >= 0 ? '↗' : '↘'} {Math.abs(pnlPercentage).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-zinc-500">
                      <p className="text-lg">No performance data available.</p>
                      <p className="text-sm mt-2">Add assets to see PnL calculations.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="aurum-card p-10 rounded-[2rem]">
        <h3 className="text-2xl font-bold mb-8 tracking-tighter">Register new position</h3>
        <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Asset</label>
            
            {isAddingNewAsset ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Custom asset name..."
                  className="bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNewAssetToMasterList()}
                />
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={addNewAssetToMasterList}
                    className="flex-1 bg-green-500/20 text-green-500 py-2 rounded-lg text-xs font-bold"
                  >
                    Add Custom
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingNewAsset(false);
                      setAssetSearchQuery('');
                    }}
                    className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
                <div className="flex flex-col gap-2">
                  {/* 1. DROPDOWN SEKARANG DI ATAS */}
                  <select 
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
                    value={newAsset.name}
                    onChange={(e) => handleAssetSelect(e.target.value)}
                  >
                    <optgroup label="Cryptocurrencies">
                      {ASSET_LIBRARY
                        .filter(a => a.type === 'crypto')
                        .map(asset => (
                          <option key={asset.id} value={asset.name}>
                            {asset.name} ({asset.symbol})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Stocks">
                      {ASSET_LIBRARY
                        .filter(a => a.type === 'stock')
                        .map(asset => (
                          <option key={asset.id} value={asset.name}>
                            {asset.name} ({asset.symbol})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Cash & Currencies">
                      {ASSET_LIBRARY
                        .filter(a => a.type === 'cash')
                        .map(asset => (
                          <option key={asset.id} value={asset.name}>
                            {asset.name} ({asset.symbol})
                          </option>
                        ))}
                    </optgroup>
                    <option value="new-asset" className="text-green-500 font-bold bg-black">
                      + Add Custom Asset
                    </option>
                  </select>

                  {/* 2. SEARCH INPUT SEKARANG DI BAWAHNYA */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search (BTC, BBCA...)"
                      className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                    />
                    
                    {/* Search Results Dropdown (tetap absolute terhadap input) */}
                    {assetSearchQuery && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                        {searchResults.map(asset => (
                          <div
                            key={asset.id}
                            className="p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0"
                            onClick={() => {
                              setNewAsset({ 
                                ...newAsset, 
                                name: asset.name,
                                color: asset.color || COLOR_OPTIONS[0]
                              });
                              setAssetSearchQuery('');
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-white">{asset.name}</p>
                                <p className="text-xs text-zinc-400">{asset.symbol} • {asset.category}</p>
                              </div>
                              <span className="text-xs px-2 py-1 rounded bg-white/5 text-zinc-400">
                                {asset.type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            
            {/* Selected Asset Info */}
            {newAsset.name && !isAddingNewAsset && getAssetInfo(newAsset.name) && (
              <div className="mt-2 p-3 bg-zinc-900/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{getAssetInfo(newAsset.name).name}</p>
                    <p className="text-xs text-zinc-400">
                      {getAssetInfo(newAsset.name).description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLOR SELECTION */}
          {isAddingNewAsset && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                Color for New Asset
              </label>
              <div className="grid grid-cols-5 gap-2 p-2 bg-black/50 rounded-xl">
                {COLOR_OPTIONS.map(color => (
                  <button
                    type="button"
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-125 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] ${
                      newAsset.color === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewAsset({...newAsset, color: color})} 
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Currency</label>
            <select 
              className="bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
              value={newAsset.currency}
              onChange={(e) => setNewAsset({...newAsset, currency: e.target.value})}
            >
              <option value="USD">USD ($)</option>
              <option value="CAD">CAD ($)</option>
              <option value="IDR">IDR (Rp)</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Transaction Type</label>
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1">
              {/* METALLIC GREEN BUY BUTTON */}
              <button
                type="button"
                onClick={() => setNewAsset({...newAsset, type: 'BUY'})}
                className={`flex-1 py-3 rounded-lg text-xs font-black transition-all relative overflow-hidden tracking-widest
                  ${newAsset.type === 'BUY' 
                    ? 'bg-gradient-to-br from-[#4ADE80] via-[#22C55E] to-[#15803D] text-black shadow-lg shadow-green-500/20 border border-[#4ADE80]/30 active:scale-[0.95]' 
                    : 'bg-green-500/10 text-green-500/40 hover:bg-green-500/20'
                  }
                  before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                  before:via-white/20 before:to-transparent before:translate-x-[-100%] 
                  hover:before:translate-x-[100%] before:transition-transform before:duration-700`}
              >
                BUY
              </button>

              {/* METALLIC RED SELL BUTTON */}
              <button
                type="button"
                onClick={() => setNewAsset({...newAsset, type: 'SELL'})}
                className={`flex-1 py-3 rounded-lg text-xs font-black transition-all relative overflow-hidden tracking-widest
                  ${newAsset.type === 'SELL' 
                    ? 'bg-gradient-to-br from-[#F87171] via-[#EF4444] to-[#B91C1C] text-black shadow-lg shadow-red-500/20 border border-[#F87171]/30 active:scale-[0.95]' 
                    : 'bg-red-500/10 text-red-500/40 hover:bg-red-500/20'
                  }
                  before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
                  before:via-white/20 before:to-transparent before:translate-x-[-100%] 
                  hover:before:translate-x-[100%] before:transition-transform before:duration-700`}
              >
                SELL
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Buy Price</label>
            <input 
              type="text" 
              placeholder="0.00"
              className="bg-black border border-zinc-800 p-4 rounded-xl text-sm 
                        text-white font-bold outline-none 
                        focus:border-[#D3AC2C] 
                        placeholder:text-zinc-600"
              value={newAsset.buyPrice}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length <= 1) {
                  setNewAsset({ ...newAsset, buyPrice: val });
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Amount</label>
            <input 
              type="text" 
              placeholder="0.00"
              className="bg-black border border-zinc-800 p-4 rounded-xl text-sm 
                        text-white font-bold outline-none 
                        focus:border-[#D3AC2C] 
                        placeholder:text-zinc-600"
              value={newAsset.amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length <= 1) {
                  setNewAsset({ ...newAsset, amount: val });
                }
              }}
            />
          </div>

          {/* Add this field after the "Amount" field */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
              Purchase Date
            </label>
            <input 
              type="date" 
              className="bg-black border border-zinc-800 p-4 rounded-xl text-sm 
                        text-white font-bold outline-none 
                        focus:border-[#D3AC2C] 
                        placeholder:text-zinc-600"
              value={newAsset.purchaseDate}
              onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
            />
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <button 
              type="submit" 
              
              className="relative overflow-hidden bg-gradient-to-br from-[#F9E08B] via-[#D3AC2C] to-[#A57A03] 
             text-black font-bold px-10 py-4 rounded-xl transition-all 
             disabled:opacity-50 hover:brightness-110 active:scale-[0.98] 
             shadow-lg shadow-[#D3AC2C]/20 border border-[#F9E08B]/30 
             before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
             before:via-white/20 before:to-transparent before:translate-x-[-100%] 
             hover:before:translate-x-[100%] before:transition-transform before:duration-700"
              disabled={!newAsset.name || !newAsset.buyPrice || !newAsset.amount}
            >
              Add to Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Portfolio;