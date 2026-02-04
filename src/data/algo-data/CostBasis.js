export const calculateTotalCostBasis = async (buyLots, targetCurrency = 'USD') => {
  if (!buyLots || buyLots.length === 0) return 0;

  let totalBasis = 0;

  // We map through lots to handle potential async rate fetching
  const lotCalculations = buyLots.map(async (lot) => {
    const amount = lot.remainingAmount || 0;
    const originalPrice = lot.originalPrice || 0;
    const originalCurrency = lot.originalCurrency || 'USD';
    const date = lot.purchaseDate;

    // 1. If same currency, no conversion needed
    if (originalCurrency === targetCurrency) {
      return amount * originalPrice;
    }

    // 2. Fetch rates from your Firebase-backed endpoint for that specific date
    // You'll need to implement this fetcher in priceService.js
    const response = await fetch(`${BACKEND_URL}/get-historical-rate?date=${date}&currency=${targetCurrency}`);
    const data = await response.json();
    const rateToTarget = data.rate || 1;

    const responseOrig = await fetch(`${BACKEND_URL}/get-historical-rate?date=${date}&currency=${originalCurrency}`);
    const dataOrig = await responseOrig.json();
    const rateToOriginal = dataOrig.rate || 1;

    // Formula: (Price / OriginalRate) * TargetRate
    const priceInTarget = (originalPrice / rateToOriginal) * rateToTarget;
    
    return amount * priceInTarget;
  });

  

  const results = await Promise.all(lotCalculations);
  return results.reduce((acc, val) => acc + val, 0);
};

export const convertCurrency = async (amount, price, fromCurrency, toCurrency, date) => {
  if (fromCurrency === toCurrency) return price;

  // Fetch rates from your backend (which pulls from Firebase)
  const response = await fetch(`${BACKEND_URL}/get-historical-rate?date=${date}&currency=${toCurrency}`);
  const data = await response.json();
  const rateToTarget = data.rate || 1;

  const responseOrig = await fetch(`${BACKEND_URL}/get-historical-rate?date=${date}&currency=${fromCurrency}`);
  const dataOrig = await responseOrig.json();
  const rateToOriginal = dataOrig.rate || 1;

  // Formula: (Price / OriginalRate) * TargetRate
  return (price / rateToOriginal) * rateToTarget;
};

export const calculateAverageBuyPrice = (totalCostBasis, totalAmount) => {
  if (!totalAmount || totalAmount <= 0) return 0;
  return totalCostBasis / totalAmount;
};