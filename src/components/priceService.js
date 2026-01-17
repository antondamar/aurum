// priceService.js

// IMPORTANT: Replace this with your actual Render URL (e.g., https://aurum-backend.onrender.com)
const BACKEND_URL = 'https://aurum-backend-tpaz.onrender.com'; 

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
let priceCache = {};
let lastCacheTime = {};

// --- CRYPTO LOGIC (UNCHANGED) ---
export const fetchCryptoPrice = async (coingeckoId) => {
  try {
    if (priceCache[coingeckoId] && Date.now() - (lastCacheTime[coingeckoId] || 0) < 300000) {
      return priceCache[coingeckoId];
    }
    const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
    const data = await response.json();
    const price = data[coingeckoId]?.usd || 0;
    priceCache[coingeckoId] = price;
    lastCacheTime[coingeckoId] = Date.now();
    return price;
  } catch (error) {
    return priceCache[coingeckoId] || 0;
  }
};

export const fetchBatchCryptoPrices = async (coingeckoIds) => {
  try {
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd`;
    const response = await fetch(url);
    const data = await response.json();
    const prices = {};
    coingeckoIds.forEach(id => {
      if (data[id]) {
        priceCache[id] = data[id].usd;
        lastCacheTime[id] = Date.now();
        prices[id] = data[id].usd;
      } else {
        prices[id] = priceCache[id] || 0;
      }
    });
    return prices;
  } catch (error) {
    return coingeckoIds.reduce((acc, id) => { acc[id] = priceCache[id] || 0; return acc; }, {});
  }
};

// --- UPDATED STOCK LOGIC (Now using your Live Render Backend) ---
export const fetchStockPrice = async (symbol, currentIdrRate) => {
  try {
    // Calling your Python app.py hosted on Render
    const response = await fetch(`${BACKEND_URL}/get-price?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    let rawPrice = data.price || 0;

    // Handle Indonesia stocks (.JK)
    if (symbol.includes('.JK')) {
      // yfinance returns IDR for .JK stocks; convert to USD for database consistency
      // Using a fallback of 15600 if currentIdrRate is missing
      return rawPrice / (currentIdrRate || 15600); 
    }
    return rawPrice;
  } catch (error) {
    console.error("Error fetching from Render Backend:", error);
    return 0;
  }
};

export const fetchForexPrice = async (currencySymbol) => {
  try {
    // Fetch fresh exchange rates
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    const rates = data.rates || {};
    
    if (rates[currencySymbol]) {
      // Price of 1 unit of foreign currency in USD
      return 1 / rates[currencySymbol];
    } else if (currencySymbol === 'USD') {
      return 1;
    } else {
      console.warn(`Exchange rate not found for ${currencySymbol}`);
      return 0;
    }
  } catch (error) {
    console.error(`Error fetching forex for ${currencySymbol}:`, error);
    return 0;
  }
};


export const fetchExchangeRates = async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    return data.rates; // Returns { USD: 1, IDR: 15600, CHF: 0.86, ... }
  } catch (error) {
    console.error("Error fetching rates:", error);
    return null;
  }
};


// Inside priceService.js
export const fetchAIInsights = async (symbol, interval = 'daily') => {
  try {
    // Only send the 'interval' parameter (daily/monthly)
    const response = await fetch(
      `${BACKEND_URL}/get-ai-insight?symbol=${symbol}&interval=${interval}`
    );
    
    if (!response.ok) {
      throw new Error(`AI Insight failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return { error: error.message };
  }
};
