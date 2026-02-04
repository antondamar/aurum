import { convertCurrency, calculateAverageBuyPrice } from './CostBasis';

export const calculateFIFOMetrics = async (transactions, targetCurrency = 'USD') => {
  if (!transactions || transactions.length === 0) {
    return { costBasis: 0, amount: 0, realizedPnL: 0, firstDate: null, avgBuy: 0 };
  }

  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstPurchaseDate = sortedTxs.find(tx => tx.type === 'BUY')?.date || null;
  
  let buyLots = [];
  let totalRealizedPnL = 0;

  for (const tx of sortedTxs) {
    // 1. Normalize the transaction price to the target switcher currency AT THE TIME of tx
    const normalizedPrice = await convertCurrency(
      tx.amount, 
      tx.price, 
      tx.currency || 'USD', 
      targetCurrency, 
      tx.date
    );

    if (tx.type === 'BUY') {
      buyLots.push({
        remainingAmount: tx.amount,
        priceInTarget: normalizedPrice,
        date: tx.date
      });
    } else if (tx.type === 'SELL') {
      let amountToSell = tx.amount;
      
      while (amountToSell > 0 && buyLots.length > 0) {
        const oldestLot = buyLots[0];
        const sellFromThisLot = Math.min(amountToSell, oldestLot.remainingAmount);
        
        // Both values are now in the same targetCurrency
        const costBasisOfPortion = sellFromThisLot * oldestLot.priceInTarget;
        const proceedsOfPortion = sellFromThisLot * normalizedPrice;
        
        totalRealizedPnL += (proceedsOfPortion - costBasisOfPortion);
        
        oldestLot.remainingAmount -= sellFromThisLot;
        amountToSell -= sellFromThisLot;

        if (oldestLot.remainingAmount <= 0) buyLots.shift();
      }
    }
  }

  const remainingCostBasis = buyLots.reduce((sum, lot) => sum + (lot.remainingAmount * lot.priceInTarget), 0);
  const totalRemainingAmount = buyLots.reduce((sum, lot) => sum + lot.remainingAmount, 0);
  const avgBuy = calculateAverageBuyPrice(remainingCostBasis, totalRemainingAmount);

  return { 
    costBasis: remainingCostBasis, 
    amount: totalRemainingAmount, 
    realizedPnL: totalRealizedPnL,
    firstDate: firstPurchaseDate,
    avgBuy: avgBuy
  };
};