import { ASSET_LIBRARY } from '../assets-data/assetLibrary';

export const getAssetInfo = (assetName, assetSymbol) => {
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

  // Priority 4: Case-insensitive match (for tickers like "BBCA")
  const lowerCleanName = cleanName.toLowerCase();

  // Try matching against name first
  const nameMatch = ASSET_LIBRARY.find(a => 
    a.name.toLowerCase() === lowerCleanName
  );
  if (nameMatch) {
    console.log(`✅ Name match found: ${nameMatch.name}`);
    return nameMatch;
  }

  // Try matching against symbol (for cases like "AAPL" → finds Apple)
  const symbolMatch2 = ASSET_LIBRARY.find(a => 
    a.symbol.toLowerCase() === lowerCleanName ||
    a.symbol.toLowerCase().startsWith(lowerCleanName + '.')  // Match "BBCA" to "BBCA.JK"
  );
  if (symbolMatch2) {
    console.log(`✅ Symbol match found: ${symbolMatch2.name} (${symbolMatch2.symbol})`);
    return symbolMatch2;
  }

  // Priority 5: Partial match as fallback
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