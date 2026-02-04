import { fetchBatchCryptoPrices, fetchStockPrice } from './priceService';
import { getAssetInfo } from '../algo-data/GetAssetInfo';

/**
 * Orchestrates fetching fresh prices for an array of assets.
 * @param {Array} assets - The list of assets from the active portfolio.
 * @param {Object} rates - Current exchange rates (e.g., USD to IDR).
 * @returns {Object} - A mapping of asset names to their new USD prices.
 */
export const updateAllPrices = async (assets, rates) => {
  if (!assets || assets.length === 0) return {};

  const cryptoAssets = [];
  const stockAssets = [];
  const cashAssets = [];

  // 1. Categorize assets based on library info
  assets.forEach(asset => {
    const info = getAssetInfo(asset.name, asset.symbol);
    if (!info) return;

    if (info.type === 'crypto' && info.coingeckoId) {
      cryptoAssets.push({ name: asset.name, id: info.coingeckoId });
    } else if (info.type === 'stock' && info.symbol) {
      stockAssets.push({ name: asset.name, symbol: info.symbol });
    } else if (info.type === 'cash') {
      cashAssets.push({ name: asset.name, symbol: info.symbol || asset.name });
    }
  });

  const newPrices = {};

  // 2. Batch Fetch Cryptocurrencies
  if (cryptoAssets.length > 0) {
    const ids = cryptoAssets.map(a => a.id);
    const prices = await fetchBatchCryptoPrices(ids);
    cryptoAssets.forEach(a => {
      if (prices[a.id]) newPrices[a.name] = prices[a.id];
    });
  }

  // 3. Fetch Stocks Individually
  if (stockAssets.length > 0) {
    await Promise.all(stockAssets.map(async (asset) => {
      try {
        // Determine exchange just for logging/logic if needed
        const exchange = asset.symbol.includes('.JK') ? 'IDX' : 'US';
        
        // Pass the symbol EXACTLY as it is in your library (e.g., "BBCA.JK")
        const price = await fetchStockPrice(asset.symbol, exchange);
        
        if (price > 0) newPrices[asset.name] = price;
      } catch (err) {
        console.error(`Failed to fetch ${asset.name}`, err);
      }
    }));
  }

  // 4. Handle Cash/Forex Prices
  cashAssets.forEach(asset => {
    const symbol = asset.symbol.match(/\(([^)]+)\)/)?.[1] || asset.symbol;
    if (symbol === 'USD') {
      newPrices[asset.name] = 1;
    } else if (rates[symbol]) {
      newPrices[asset.name] = 1 / rates[symbol];
    }
  });

  return newPrices;
};