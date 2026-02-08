const BACKEND_URL = 'https://aurum-backend-tpaz.onrender.com'; 
const rateCache = new Map();


const fetchRateWithFallback = async (date, currency) => {
  const cacheKey = `${date}-${currency}`;
  if (rateCache.has(cacheKey)) return rateCache.get(cacheKey);

  const baseDate = new Date(date);
  
  for (let i = 0; i < 5; i++) {
    const checkDate = new Date(baseDate);
    checkDate.setUTCDate(baseDate.getUTCDate() - i);
    const formattedDate = checkDate.toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${BACKEND_URL}/get-historical-rate?date=${formattedDate}&currency=${currency}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.rate !== undefined && data.rate !== null) {
          console.log(`✅ Found: ${currency} on ${formattedDate} (Attempt ${i + 1})`);
          // Store in cache before returning
          rateCache.set(cacheKey, data.rate); 
          return data.rate;
        }
      }
    } catch (e) {
      console.warn(`⚠️ No data for ${formattedDate}, checking prior day...`);
    }
  }

  console.error(`❌ No rate for ${currency} in 5-day interval ending ${date}`);
  return 1; 
};

export const calculateTotalCostBasis = async (buyLots, targetCurrency = 'USD') => {
  if (!buyLots || buyLots.length === 0) return 0;

  const lotCalculations = buyLots.map(async (lot) => {
    const amount = lot.remainingAmount || 0;
    const originalPrice = lot.originalPrice || 0;
    const originalCurrency = lot.originalCurrency || 'USD';
    const date = lot.purchaseDate;

    if (originalCurrency === targetCurrency) {
      return amount * originalPrice;
    }

    // Fetch both rates using the fallback logic
    const rateToTarget = await fetchRateWithFallback(date, targetCurrency);
    const rateToOriginal = await fetchRateWithFallback(date, originalCurrency);

    // Formula: (Price / OriginalRate) * TargetRate
    const priceInTarget = (originalPrice / rateToOriginal) * rateToTarget;
    
    return amount * priceInTarget;
  });

  const results = await Promise.all(lotCalculations);
  return results.reduce((acc, val) => acc + val, 0);
};

export const convertCurrency = async (amount, price, fromCurrency, toCurrency, date) => {
  if (fromCurrency === toCurrency) return price;

  // Ensure we have a valid date string
  let initialDate;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) throw new Error("Invalid Date");
    initialDate = d.toISOString().split('T')[0];
  } catch (err) {
    console.error("Date error in convertCurrency:", err);
    return price;
  }

  // Use fallback logic to find the nearest valid market rate
  const rateToTarget = await fetchRateWithFallback(initialDate, toCurrency);
  const rateToOriginal = await fetchRateWithFallback(initialDate, fromCurrency);

  return (price / rateToOriginal) * rateToTarget;
};

export const calculateAverageBuyPrice = (totalCostBasis, totalAmount) => {
  if (!totalAmount || totalAmount <= 0) return 0;
  return totalCostBasis / totalAmount;
};