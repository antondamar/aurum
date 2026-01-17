import React, { useState, useEffect } from 'react';

const Dashboard = ({ profileData, portfolios, currency, rates }) => {
  const [greeting, setGreeting] = useState('');
  const [dashboardData, setDashboardData] = useState({
    totalNetWorth: 0,
    totalReturnPercentage: 0,
    assetsCount: 0,
    portfolioCount: 0,
    portfolioHoldings: {
      crypto: [],
      stocks: [],
      cash: []
    },
    totalCostBasis: 0,
    // New aggregated data fields
    aggregatedStats: {
      bestPerformingAsset: null,
      worstPerformingAsset: null,
      largestHolding: null,
      smallestHolding: null,
      portfolioDistribution: {},
      assetTypeBreakdown: {
        crypto: { count: 0, value: 0, percentage: 0 },
        stocks: { count: 0, value: 0, percentage: 0 },
        cash: { count: 0, value: 0, percentage: 0 },
        other: { count: 0, value: 0, percentage: 0 }
      },
      performanceByType: {
        crypto: { totalReturn: 0, avgReturn: 0 },
        stocks: { totalReturn: 0, avgReturn: 0 },
        cash: { totalReturn: 0, avgReturn: 0 }
      },
      monthlyChange: 0,
      dailyChange: 0
    }
  });


  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        hour12: false,
      });
      
      const hour = parseInt(formatter.format(now));

      if (hour >= 5 && hour < 12) setGreeting('Good Morning');
      else if (hour >= 12 && hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };

    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate dashboard data from portfolios
  useEffect(() => {
    // Filter portfolios that should be counted in dashboard
    const countedPortfolios = portfolios.filter(p => p.countInDashboard !== false);
    
    if (countedPortfolios && countedPortfolios.length > 0) {
      let totalNetWorth = 0;
      let totalCostBasis = 0;
      let allAssets = [];
      let assetsCount = 0;
      let portfolioDistribution = {};
      let assetTypeValues = {
        crypto: { totalValue: 0, totalCost: 0, assets: [] },
        stocks: { totalValue: 0, totalCost: 0, assets: [] },
        cash: { totalValue: 0, totalCost: 0, assets: [] },
        other: { totalValue: 0, totalCost: 0, assets: [] }
      };

      // Process each counted portfolio
      countedPortfolios.forEach(portfolio => {
        const portfolioValue = portfolio.assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
        const portfolioCost = portfolio.assets.reduce((sum, asset) => sum + (asset.avgBuy || 0) * (asset.amount || 0), 0);
        
        portfolioDistribution[portfolio.name || `Portfolio ${portfolio.id}`] = {
          value: portfolioValue,
          cost: portfolioCost,
          returnPercentage: portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0,
          assetCount: portfolio.assets.length,
          isCounted: true
        };

        // Process each asset in portfolio
        portfolio.assets.forEach(asset => {
          const assetValue = asset.value || 0;
          const assetCost = (asset.avgBuy || 0) * (asset.amount || 0);
          
          totalNetWorth += assetValue;
          totalCostBasis += assetCost;
          assetsCount++;
          
          // Get asset info for grouping
          const assetType = getAssetType(asset.name);
          const assetChange = calculateAssetChange(asset);
          
          const assetData = {
            ...asset,
            type: assetType,
            allocation: 0, // Will calculate after total is known
            change: assetChange,
            changeValue: assetValue - assetCost,
            portfolio: portfolio.name || `Portfolio ${portfolio.id}`
          };
          
          allAssets.push(assetData);
          
          // Aggregate by type
          if (assetTypeValues[assetType]) {
            assetTypeValues[assetType].totalValue += assetValue;
            assetTypeValues[assetType].totalCost += assetCost;
            assetTypeValues[assetType].assets.push(assetData);
          } else {
            assetTypeValues.other.totalValue += assetValue;
            assetTypeValues.other.totalCost += assetCost;
            assetTypeValues.other.assets.push(assetData);
          }
        });
      });

      // Calculate allocation for each asset
      if (totalNetWorth > 0) {
        allAssets = allAssets.map(asset => ({
          ...asset,
          allocation: ((asset.value / totalNetWorth) * 100).toFixed(1)
        }));
      }

      // Group by type
      const groupedHoldings = groupAssetsByType(allAssets);

      // Calculate total return percentage
      const totalReturnPercentage = totalCostBasis > 0 
        ? ((totalNetWorth - totalCostBasis) / totalCostBasis) * 100 
        : 0;

      // Calculate aggregated statistics
      const aggregatedStats = calculateAggregatedStats(
        allAssets, 
        groupedHoldings, 
        totalNetWorth, 
        totalCostBasis,
        assetTypeValues,
        portfolioDistribution
      );

      setDashboardData({
        totalNetWorth,
        totalReturnPercentage,
        assetsCount,
        portfolioCount: portfolios.length,
        portfolioHoldings: groupedHoldings,
        totalCostBasis,
        aggregatedStats
      });
    } else {
        // Handle case when no portfolios are counted
        setDashboardData({
          totalNetWorth: 0,
          totalReturnPercentage: 0,
          assetsCount: 0,
          portfolioCount: 0,
          portfolioHoldings: {
            crypto: [],
            stocks: []
          },
          totalCostBasis: 0,
          aggregatedStats: {
            bestPerformingAsset: null,
            worstPerformingAsset: null,
            largestHolding: null,
            smallestHolding: null,
            portfolioDistribution: {},
            assetTypeBreakdown: {
              crypto: { count: 0, value: 0, percentage: 0 },
              stocks: { count: 0, value: 0, percentage: 0 },
              other: { count: 0, value: 0, percentage: 0 }
            },
            performanceByType: {
              crypto: { totalReturn: 0, avgReturn: 0 },
              stocks: { totalReturn: 0, avgReturn: 0 }
            },
            monthlyChange: 0,
            dailyChange: 0
          }
        });
      }
    }, [portfolios]);

  // Calculate aggregated statistics
  const calculateAggregatedStats = (allAssets, groupedHoldings, totalNetWorth, totalCostBasis, assetTypeValues, portfolioDistribution) => {
    const emptyAssetStats = { count: 0, value: 0, percentage: 0 };
    const emptyPerfStats = { totalReturn: 0, avgReturn: 0 };
    
    if (allAssets.length === 0) {
      return {
        bestPerformingAsset: null,
        worstPerformingAsset: null,
        largestHolding: null,
        smallestHolding: null,
        portfolioDistribution: {},
        assetTypeBreakdown: { 
          crypto: emptyAssetStats, 
          stocks: emptyAssetStats, 
          cash: emptyAssetStats, 
          other: emptyAssetStats 
        },
        performanceByType: { 
          crypto: emptyPerfStats, 
          stocks: emptyPerfStats, 
          cash: emptyPerfStats 
        },
        monthlyChange: 0, dailyChange: 0
      };
    }

    // Find best and worst performing assets
    let bestPerformingAsset = null;
    let worstPerformingAsset = null;
    let largestHolding = null;
    let smallestHolding = null;

    allAssets.forEach(asset => {
      const changePercent = parseFloat(asset.change);
      const assetValue = asset.value || 0;
      
      // Best performing
      if (!bestPerformingAsset || changePercent > parseFloat(bestPerformingAsset.change)) {
        bestPerformingAsset = asset;
      }
      
      // Worst performing
      if (!worstPerformingAsset || changePercent < parseFloat(worstPerformingAsset.change)) {
        worstPerformingAsset = asset;
      }
      
      // Largest holding
      if (!largestHolding || assetValue > largestHolding.value) {
        largestHolding = asset;
      }
      
      // Smallest holding
      if (!smallestHolding || assetValue < smallestHolding.value) {
        smallestHolding = asset;
      }
    });

    // Calculate asset type breakdown
    const assetTypeBreakdown = {
      crypto: {
        count: groupedHoldings.crypto.length,
        value: assetTypeValues.crypto.totalValue,
        percentage: totalNetWorth > 0 ? (assetTypeValues.crypto.totalValue / totalNetWorth) * 100 : 0
      },
      stocks: {
        count: groupedHoldings.stocks.length,
        value: assetTypeValues.stocks.totalValue,
        percentage: totalNetWorth > 0 ? (assetTypeValues.stocks.totalValue / totalNetWorth) * 100 : 0
      },
      cash: {
        count: groupedHoldings.cash.length,
        value: assetTypeValues.cash.totalValue,
        percentage: totalNetWorth > 0 ? (assetTypeValues.cash.totalValue / totalNetWorth) * 100 : 0
      },
      other: {
        count: allAssets.filter(a => !['crypto', 'stocks', 'cash'].includes(a.type)).length,
        value: assetTypeValues.other.totalValue,
        percentage: totalNetWorth > 0 ? (assetTypeValues.other.totalValue / totalNetWorth) * 100 : 0
      }
    };

    const calculateTypePerformance = (typeData) => ({
      totalReturn: typeData.totalCost > 0 
        ? ((typeData.totalValue - typeData.totalCost) / typeData.totalCost) * 100 
        : 0,
      avgReturn: typeData.assets.length > 0 
        ? typeData.assets.reduce((sum, a) => sum + parseFloat(a.change), 0) / typeData.assets.length 
        : 0
    });

    const performanceByType = {
      crypto: calculateTypePerformance(assetTypeValues.crypto),
      stocks: calculateTypePerformance(assetTypeValues.stocks),
      cash: calculateTypePerformance(assetTypeValues.cash)
    };

    // Calculate monthly and daily change (mock data - you'd integrate with real historical data)
    const monthlyChange = totalCostBasis > 0 ? (Math.random() * 20 - 10) : 0; // Mock: -10% to +10%
    const dailyChange = totalCostBasis > 0 ? (Math.random() * 5 - 2.5) : 0; // Mock: -2.5% to +2.5%

    return {
      bestPerformingAsset,
      worstPerformingAsset,
      largestHolding,
      smallestHolding,
      portfolioDistribution,
      assetTypeBreakdown,
      performanceByType,
      monthlyChange,
      dailyChange
    };
  };

  // Helper function to determine asset type
  const getAssetType = (assetName) => {
    if (!assetName || typeof assetName !== 'string') return 'other'; 
    const lowerName = assetName.toLowerCase();
    const cryptoKeywords = ['bitcoin', 'ethereum', '(btc)', '(eth)', 'crypto', 'solana', 'usdt', 'xrp', 'cardano', 'dogecoin'];
    const stockKeywords = ['inc', 'corp', 'ltd', 'plc', 'co', 'group', 'holdings'];
    // Added currency keywords for IDR, USD, CAD, CHF, CNY, JPY, SGD
    const cashKeywords = ['rupiah', 'dollar', 'franc', 'yuan', 'yen', 'sgd', 'idr', 'usd', 'cad', 'chf', 'cny', 'jpy'];
    
    if (cryptoKeywords.some(keyword => lowerName.includes(keyword))) return 'crypto';
    if (cashKeywords.some(keyword => lowerName.includes(keyword))) return 'cash'; // Add this check
    if (stockKeywords.some(keyword => lowerName.includes(keyword)) || /^[A-Z]{1,5}$/.test(assetName)) return 'stocks';
    return 'other';
  };

  // Helper function to calculate asset change
  const calculateAssetChange = (asset) => {
    if (!asset || !asset.avgBuy || !asset.amount || !asset.value) return '0.0';
    
    const costBasis = (asset.avgBuy || 0) * (asset.amount || 0);
    const currentValue = asset.value || 0;
    
    if (costBasis === 0) return '0.0';
    const change = ((currentValue - costBasis) / costBasis) * 100;
    return change.toFixed(1);
  };

  // Helper function to group assets by type
  const groupAssetsByType = (assets) => {
    const grouped = {
      crypto: [],
      stocks: [],
      cash: [] // Add this
    };

    assets.forEach(asset => {
      if (asset.type === 'crypto') {
        grouped.crypto.push(asset);
      } else if (asset.type === 'stocks') {
        grouped.stocks.push(asset);
      } else if (asset.type === 'cash') {
        grouped.cash.push(asset);
      }
    });

    return grouped;
  };

  // Format currency values
  const formatValue = (val, curr = 'USD') => {
    const numericVal = val || 0;
    const rate = rates?.[curr] || 1;
    const converted = numericVal * rate;
    
    return new Intl.NumberFormat(curr === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: curr === 'IDR' ? 0 : (Math.abs(converted) < 2 ? 4 : 2),
      maximumFractionDigits: curr === 'IDR' ? 0 : (Math.abs(converted) < 2 ? 4 : 2)
    }).format(converted);
  };

  // Format percentage
  const formatPercentage = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto pt-24">
      <title>Home</title>
      {/* Header Section */}
      <header className="mb-4">
        <h1 className="text-5xl font-extrabold tracking-tighter text-white">
          {greeting}, <span className="gold-text">{profileData?.firstName || 'Investor'}</span>
        </h1>
        <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold mt-7">
          Investment Overview
          {portfolios.length > dashboardData.portfolioCount && (
            <span className="text-amber-500 ml-2">
              • {portfolios.length - dashboardData.portfolioCount} portfolio(s) excluded
            </span>
          )}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Net Worth */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Total Net Worth</p>
          <h2 className="text-3xl font-bold mt-2 gold-text">
            {formatValue(dashboardData.totalNetWorth, currency || 'USD')}
          </h2>
        </div>
        
        {/* Assets Count */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Active Assets</p>
          <h2 className="text-3xl font-bold mt-2">{dashboardData.assetsCount}</h2>
          <p className="text-zinc-500 text-xs mt-1 italic">
            Across {dashboardData.portfolioCount} Portfolio{dashboardData.portfolioCount !== 1 ? 's' : ''}
            {portfolios.length > dashboardData.portfolioCount && (
              <span className="text-amber-500 ml-1">
                ({portfolios.length - dashboardData.portfolioCount} hidden)
              </span>
            )}
          </p>
        </div>

        {/* Total Return */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Total Return</p>
          <h2 className={`text-3xl font-bold mt-2 ${
            (dashboardData.totalNetWorth - dashboardData.totalCostBasis) >= 0 
              ? 'text-emerald-400' 
              : 'text-red-400'
          }`}>
            {formatValue(dashboardData.totalNetWorth - dashboardData.totalCostBasis, currency)}
          </h2>
          <p className={`text-sm font-medium ${dashboardData.totalReturnPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {dashboardData.totalReturnPercentage >= 0 ? '↗' : '↘'} {formatPercentage(dashboardData.totalReturnPercentage)}
          </p>
        </div>
      </div>

      {/* AGGREGATED STATS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Best Performing Asset */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Best Performer</p>
          {dashboardData.aggregatedStats.bestPerformingAsset ? (
            <>
              <h2 className="text-2xl font-bold mt-2 text-emerald-400">
                {dashboardData.aggregatedStats.bestPerformingAsset.name}
              </h2>
              <p className="text-emerald-400 text-sm font-medium">
                +{parseFloat(dashboardData.aggregatedStats.bestPerformingAsset.change).toFixed(1)}%
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                Value: {formatValue(dashboardData.aggregatedStats.bestPerformingAsset.value, currency)}
              </p>
            </>
          ) : (
            <p className="text-zinc-500 italic mt-2">No data</p>
          )}
        </div>

        {/* Worst Performing Asset */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Worst Performer</p>
          {dashboardData.aggregatedStats.worstPerformingAsset ? (
            <>
              <h2 className="text-2xl font-bold mt-2 text-red-400">
                {dashboardData.aggregatedStats.worstPerformingAsset.name}
              </h2>
              <p className="text-red-400 text-sm font-medium">
                {parseFloat(dashboardData.aggregatedStats.worstPerformingAsset.change).toFixed(1)}%
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                Value: {formatValue(dashboardData.aggregatedStats.worstPerformingAsset.value, currency)}
              </p>
            </>
          ) : (
            <p className="text-zinc-500 italic mt-2">No data</p>
          )}
        </div>

        {/* Largest Holding */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Largest Holding</p>
          {dashboardData.aggregatedStats.largestHolding ? (
            <>
              <h2 className="text-2xl font-bold mt-2 gold-text">
                {dashboardData.aggregatedStats.largestHolding.name}
              </h2>
              <p className="text-zinc-400 text-sm">
                {dashboardData.aggregatedStats.largestHolding.allocation}% of portfolio
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                {formatValue(dashboardData.aggregatedStats.largestHolding.value, currency)}
              </p>
            </>
          ) : (
            <p className="text-zinc-500 italic mt-2">No data</p>
          )}
        </div>

        {/* Asset Distribution */}
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Asset Distribution</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">Crypto</span>
                <span className="gold-text">
                  {dashboardData.aggregatedStats.assetTypeBreakdown.crypto.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-[#BF00FF]" 
                  style={{ width: `${dashboardData.aggregatedStats.assetTypeBreakdown.crypto.percentage}%` }}
                />
              </div>
            </div>  

            <div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">Stocks</span>
                <span className="gold-text">
                  {dashboardData.aggregatedStats.assetTypeBreakdown.stocks.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-[#D3D3D3]" 
                  style={{ width: `${dashboardData.aggregatedStats.assetTypeBreakdown.stocks.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">Forex</span>
                <span className="gold-text">
                  {dashboardData.aggregatedStats.assetTypeBreakdown.cash.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mt-1">
                <div  
                  className="h-full bg-[#40916C]" 
                  style={{ width: `${dashboardData.aggregatedStats.assetTypeBreakdown.cash.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Asset Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="aurum-card p-6 rounded-2xl">
          <h3 className="font-bold text-lg mb-4">Crypto Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Return</span>
              <span className={`text-lg font-bold ${
                dashboardData.aggregatedStats.performanceByType.crypto.totalReturn >= 0 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(dashboardData.aggregatedStats.performanceByType.crypto.totalReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Average Asset Return</span>
              <span className={`text-lg font-bold ${
                dashboardData.aggregatedStats.performanceByType.crypto.avgReturn >= 0 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(dashboardData.aggregatedStats.performanceByType.crypto.avgReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Value</span>
              <span className="text-lg font-bold gold-text">
                {formatValue(dashboardData.aggregatedStats.assetTypeBreakdown.crypto.value, currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="aurum-card p-6 rounded-2xl">
          <h3 className="font-bold text-lg mb-4">Stocks Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Return</span>
              <span className={`text-lg font-bold ${
                dashboardData.aggregatedStats.performanceByType.stocks.totalReturn >= 0 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(dashboardData.aggregatedStats.performanceByType.stocks.totalReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Average Asset Return</span>
              <span className={`text-lg font-bold ${
                dashboardData.aggregatedStats.performanceByType.stocks.avgReturn >= 0 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(dashboardData.aggregatedStats.performanceByType.stocks.avgReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Value</span>
              <span className="text-lg font-bold gold-text">
                {formatValue(dashboardData.aggregatedStats.assetTypeBreakdown.stocks.value, currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="aurum-card p-6 rounded-2xl">
          <h3 className="font-bold text-lg mb-4">Forex Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Return</span>
              <span className={`text-lg font-bold ${
                dashboardData.aggregatedStats.performanceByType.cash.totalReturn >= 0 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(dashboardData.aggregatedStats.performanceByType.cash.totalReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Average Asset Return</span>
              <span className={`text-lg font-bold ${
                dashboardData.aggregatedStats.performanceByType.cash.avgReturn >= 0 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {formatPercentage(dashboardData.aggregatedStats.performanceByType.cash.avgReturn)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total Value</span>
              <span className="text-lg font-bold gold-text">
                {formatValue(dashboardData.aggregatedStats.assetTypeBreakdown.cash.value, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Holdings Grouped by Type */}
      <div className="aurum-card rounded-2xl overflow-hidden mb-6">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="font-bold text-lg">Portfolio Holdings</h3>
        </div>
        
        {/* Crypto Assets Section */}
        {dashboardData.portfolioHoldings.crypto && dashboardData.portfolioHoldings.crypto.length > 0 && (
          <div className="mb-6">
            <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
              <h4 className="font-bold gold-text text-sm uppercase tracking-wider">
                Cryptocurrencies ({dashboardData.portfolioHoldings.crypto.length})
              </h4>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white/5 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Allocation</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Change</th>
                  <th className="p-4">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {dashboardData.portfolioHoldings.crypto.map((asset, index) => (
                  <tr key={`crypto-${index}`} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">
                      <div className="flex items-center gap-3">
                        {asset.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: asset.color }}
                          />
                        )}
                        {asset.name}
                      </div>
                    </td>
                    <td className="p-4">{asset.allocation}%</td>
                    <td className="p-4">{formatValue(asset.value, currency)}</td>
                    <td className={`p-4 ${parseFloat(asset.change) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parseFloat(asset.change) >= 0 ? '+' : ''}{asset.change}%
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">{asset.portfolio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stocks Assets Section */}
        {dashboardData.portfolioHoldings.stocks && dashboardData.portfolioHoldings.stocks.length > 0 && (
          <div>
            <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
              <h4 className="font-bold gold-text text-sm uppercase tracking-wider">
                Stocks ({dashboardData.portfolioHoldings.stocks.length})
              </h4>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white/5 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Allocation</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Change</th>
                  <th className="p-4">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {dashboardData.portfolioHoldings.stocks.map((asset, index) => (
                  <tr key={`stock-${index}`} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">
                      <div className="flex items-center gap-3">
                        {asset.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: asset.color }}
                          />
                        )}
                        {asset.name}
                      </div>
                    </td>
                    <td className="p-4">{asset.allocation}%</td>
                    <td className="p-4">{formatValue(asset.value, currency)}</td>
                    <td className={`p-4 ${parseFloat(asset.change) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parseFloat(asset.change) >= 0 ? '+' : ''}{asset.change}%
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">{asset.portfolio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Forex Assets Section inside Portfolio Holdings (around line 555) */}
        {dashboardData.portfolioHoldings.cash && dashboardData.portfolioHoldings.cash.length > 0 && (
          <div className="mb-6">
            <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
              <h4 className="font-bold gold-text text-sm uppercase tracking-wider">
                Forex & Cash ({dashboardData.portfolioHoldings.cash.length})
              </h4>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white/5 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Allocation</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Change</th>
                  <th className="p-4">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {dashboardData.portfolioHoldings.cash.map((asset, index) => (
                  <tr key={`cash-${index}`} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">
                      <div className="flex items-center gap-3">
                        {asset.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: asset.color }}
                          />
                        )}
                        {asset.name}
                      </div>
                    </td>
                    <td className="p-4">{asset.allocation}%</td>
                    <td className="p-4">{formatValue(asset.value, currency)}</td>
                    <td className={`p-4 ${parseFloat(asset.change) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parseFloat(asset.change) >= 0 ? '+' : ''}{asset.change}%
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">{asset.portfolio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {dashboardData.portfolioHoldings.crypto?.length === 0 && 
         dashboardData.portfolioHoldings.stocks?.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-zinc-500 italic">No assets found. Add your first asset to see portfolio holdings.</p>
          </div>
        )}
      </div>

      {/* Quick Summary Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm mb-2">Cost Basis</p>
          <p className="text-2xl font-bold">{formatValue(dashboardData.totalCostBasis, currency)}</p>
        </div>
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm mb-2">Portfolio Diversification</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              {dashboardData.totalNetWorth > 0 && (
                <>
                  <div 
                    className="h-full bg-[#BF00FF] float-left" 
                    style={{ 
                      width: `${dashboardData.aggregatedStats.assetTypeBreakdown.crypto.percentage}%` 
                    }}
                  />
                  <div 
                    className="h-full bg-[#D3D3D3] float-left" 
                    style={{ 
                      width: `${dashboardData.aggregatedStats.assetTypeBreakdown.stocks.percentage}%` 
                    }}
                  />
                  <div 
                    className="h-full bg-[#40916C] float-left" 
                    style={{ 
                      width: `${dashboardData.aggregatedStats.assetTypeBreakdown.cash.percentage}%` 
                    }}
                  />
                  <div 
                    className="h-full bg-[#6B7280] float-left" 
                    style={{ 
                      width: `${dashboardData.aggregatedStats.assetTypeBreakdown.other.percentage}%` 
                    }}
                  />
                </>
              )}
            </div>
            <span className="text-xs text-zinc-400">
              {dashboardData.portfolioHoldings?.crypto?.length || 0} crypto, {dashboardData.portfolioHoldings?.stocks?.length || 0} stocks, {dashboardData.portfolioHoldings?.cash?.length || 0} cash
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;