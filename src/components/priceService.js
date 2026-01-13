// CoinGecko API configuration
const COINGECKO_API_KEY = ''; // Leave empty for free tier (100 calls/minute)
// const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY || '';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

const YAHOO_HEADERS = {
  'x-rapidapi-key': '9f45fd2dbdmsh82f344dc6bc2444p102bc1jsn523f3930051a',
  'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
};

// Cache for prices (to reduce API calls)
let priceCache = {};
let lastCacheTime = {};

// Fetch single crypto price from CoinGecko
export const fetchCryptoPrice = async (coingeckoId) => {
  try {
    // Check cache first (5-minute cache)
    if (priceCache[coingeckoId] && 
        Date.now() - (lastCacheTime[coingeckoId] || 0) < 300000) {
      return priceCache[coingeckoId];
    }

    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
    
    const response = await fetch(url, {
      headers: COINGECKO_API_KEY ? {
        'x-cg-demo-api-key': COINGECKO_API_KEY
      } : {}
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data[coingeckoId]?.usd || 0;

    // Update cache
    priceCache[coingeckoId] = price;
    lastCacheTime[coingeckoId] = Date.now();

    return price;
  } catch (error) {
    console.error(`Error fetching price for ${coingeckoId}:`, error);
    return priceCache[coingeckoId] || 0; // Return cached price if available
  }
};

// Batch fetch multiple crypto prices
export const fetchBatchCryptoPrices = async (coingeckoIds) => {
  try {
    // Filter out cached items
    const idsToFetch = coingeckoIds.filter(id => {
      return !priceCache[id] || 
             Date.now() - (lastCacheTime[id] || 0) > 300000;
    });

    if (idsToFetch.length === 0) {
      // All prices are cached
      return coingeckoIds.reduce((acc, id) => {
        acc[id] = priceCache[id] || 0;
        return acc;
      }, {});
    }

    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${idsToFetch.join(',')}&vs_currencies=usd`;
    
    const response = await fetch(url, {
      headers: COINGECKO_API_KEY ? {
        'x-cg-demo-api-key': COINGECKO_API_KEY
      } : {}
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = {};

    // Update cache and collect prices
    coingeckoIds.forEach(id => {
      if (data[id]) {
        priceCache[id] = data[id].usd;
        lastCacheTime[id] = Date.now();
        prices[id] = data[id].usd;
      } else if (priceCache[id]) {
        prices[id] = priceCache[id];
      } else {
        prices[id] = 0;
      }
    });

    return prices;
  } catch (error) {
    console.error('Error fetching batch prices:', error);
    
    // Return cached prices as fallback
    return coingeckoIds.reduce((acc, id) => {
      acc[id] = priceCache[id] || 0;
      return acc;
    }, {});
  }
};

// For stocks, we'll use a placeholder or Yahoo Finance
// You'll need to sign up for RapidAPI for real stock data
// priceService.js - update fetchStockPrice function
// Update the fetchStockPrice function in priceService.js
// src/components/priceService.js

export const fetchStockPrice = async (symbol, currentIdrRate) => {
  try {
    const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${symbol}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': '9f45fd2dbdmsh82f344dc6bc2444p102bc1jsn523f3930051a',
        'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
      }
    });

    const data = await response.json();
    if (data.quoteResponse?.result?.length > 0) {
      const quote = data.quoteResponse.result[0];
      let rawPrice = quote.regularMarketPrice || 0;

      // JIKA SAHAM INDONESIA (.JK)
      if (symbol.includes('.JK')) {
        // Yahoo IDX biasanya mengembalikan Rupiah utuh (bukan sen). 
        // Kita harus bagi dengan kurs IDR saat ini agar menjadi nilai USD di database.
        return rawPrice / currentIdrRate; 
      }
      return rawPrice;
    }
    return 0;
  } catch (error) {
    console.error("Error Yahoo API:", error);
    return 0;
  }
};

// Clear cache (useful for testing)
export const clearPriceCache = () => {
  priceCache = {};
  lastCacheTime = {};
};

// Tambahkan di priceService.js
export const fetchExchangeRates = async () => {
  try {
    // API ini gratis dan tidak perlu key untuk penggunaan dasar
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    
    if (data.result === "success") {
      return {
        USD: 1,
        CAD: data.rates.CAD,
        IDR: data.rates.IDR
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return null;
  }
};