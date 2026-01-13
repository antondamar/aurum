import { color } from "framer-motion";

export const ASSET_LIBRARY = [
  // Cryptocurrencies
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'crypto',
    category: 'Cryptocurrency',
    coingeckoId: 'bitcoin',
    description: 'The first decentralized cryptocurrency',
    color: '#F7931A', 
    icon: '/images/btc.webp'
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'crypto',
    category: 'Cryptocurrency',
    coingeckoId: 'ethereum',
    description: 'Smart contract platform',
    color: '#627EEA', 
    icon: '/images/eth.svg'
  },
  {
    id: 'binance-coin',
    name: 'Binance Coin',
    symbol: 'BNB',
    type: 'crypto',
    category: 'Exchange Token',
    coingeckoId: 'binancecoin',
    description: 'Binance exchange native token',
    color: '#F0B90B', 
    icon: '/images/bnb.png'
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    type: 'crypto',
    category: 'Smart Contract Platform',
    coingeckoId: 'solana',
    description: 'High-performance blockchain', 
    color: '#14F195', 
    icon: '/images/sol.jpg'
  },
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    type: 'crypto',
    category: 'Smart Contract Platform',
    coingeckoId: 'cardano',
    description: 'Proof-of-stake blockchain',
    color: '#0033AD', 
    icon: '/images/ada.png'
  },
  {
    id: 'ripple',
    name: 'XRP',
    symbol: 'XRP',
    type: 'crypto',
    category: 'Payment',
    coingeckoId: 'ripple',
    description: 'Digital payment protocol', 
    color: '#23292F', 
    icon: '/images/xrp.png'
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    type: 'crypto',
    category: 'Meme',
    coingeckoId: 'dogecoin',
    description: 'Meme-based cryptocurrency',
    color: '#C2A633', 
    icon: '/images/doge.jpg'
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    type: 'crypto',
    category: 'Interoperability',
    coingeckoId: 'polkadot',
    description: 'Multi-chain interoperability protocol',
    color: '#E6007A', 
    icon: '/images/dot.png'
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    symbol: 'LINK',
    type: 'crypto',
    category: 'Oracle',
    coingeckoId: 'chainlink',
    description: 'Decentralized oracle network',
    color: '#2A5ADA', 
    icon: '/images/link.png'
  },
  {
    id: 'litecoin',
    name: 'Litecoin',
    symbol: 'LTC',
    type: 'crypto',
    category: 'Payment',
    coingeckoId: 'litecoin',
    description: 'Peer-to-peer cryptocurrency',
    color: '#A6A9AA', 
    icon: '/images/ltc.jpg'
  },

  // Stocks (Indonesian)
  {
    id: 'bbca',
    name: 'BBCA',
    symbol: 'BBCA.JK',
    type: 'stock',
    category: 'Banking',
    exchange: 'IDX',
    description: 'Bank Central Asia',
    color: '#004A99', 
    icon: '/images/bbca.png'
  },
  {
    id: 'bmri',
    name: 'BMRI',
    symbol: 'BMRI.JK',
    type: 'stock',
    category: 'Banking',
    exchange: 'IDX',
    description: 'Bank Mandiri (Persero)',
    color: '#003D79', 
    icon: '/images/bmri.png'
  },
  {
    id: 'tlkm',
    name: 'TLKM',
    symbol: 'TLKM.JK',
    type: 'stock',
    category: 'Telecommunication',
    exchange: 'IDX',
    description: 'Telkom Indonesia',
    color: '#ED1E28', 
    icon: '/images/tlkm.png'
  },
  {
    id: 'asii',
    name: 'ASII',
    symbol: 'ASII.JK',
    type: 'stock',
    category: 'Automotive',
    exchange: 'IDX',
    description: 'Astra International',
    color: '#004080', 
    icon: '/images/asii.png'
  },
  {
    id: 'untr',
    name: 'UNTR',
    symbol: 'UNTR.JK',
    type: 'stock',
    category: 'Mining',
    exchange: 'IDX',
    description: 'United Tractors', 
    color: '#FECE04', 
    icon: '/images/untr.png'
  },

  // International Stocks
  {
    id: 'apple',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    type: 'stock',
    category: 'Technology',
    exchange: 'NASDAQ',
    description: 'Apple Inc. Common Stock', 
    color: '#555555', 
    icon: '/images/aapl.jpg'
  },
  {
    id: 'google',
    name: 'Alphabet Inc.',
    symbol: 'GOOGL',
    type: 'stock',
    category: 'Technology',
    exchange: 'NASDAQ',
    description: 'Alphabet Inc. Class A',
    color: "#4285F4", 
    icon: '/images/googl.jpg'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    symbol: 'MSFT',
    type: 'stock',
    category: 'Technology',
    exchange: 'NASDAQ',
    description: 'Microsoft Corporation',
    color: "#00A4EF", 
    icon: '/images/msft.png'
  },
  {
    id: 'tesla',
    name: 'Tesla Inc.',
    symbol: 'TSLA',
    type: 'stock',
    category: 'Automotive',
    exchange: 'NASDAQ',
    description: 'Tesla Inc. Common Stock',
    color: '#CC0000', 
    icon: '/images/tsla.png'
  },
  {
    id: 'amazon',
    name: 'Amazon',
    symbol: 'AMZN',
    type: 'stock',
    category: 'E-commerce',
    exchange: 'NASDAQ',
    description: 'Amazon.com Inc.',
    color: "#FF9900", 
    icon: '/images/amzn.png'
  },
  {
    id: 'meta',
    name: 'Meta Platforms',
    symbol: 'META',
    type: 'stock',
    category: 'Technology',
    exchange: 'NASDAQ',
    description: 'Meta Platforms Inc.',
    color: "#0668E1", 
    icon: '/images/meta.png'
  }
];

// Helper functions
export const getAssetByName = (name) => {
  return ASSET_LIBRARY.find(asset => asset.name === name);
};

export const getAssetBySymbol = (symbol) => {
  return ASSET_LIBRARY.find(asset => asset.symbol === symbol);
};

export const searchAssets = (query) => {
  if (!query) return ASSET_LIBRARY.slice(0, 20); // Return first 20 if no query
  
  const lowerQuery = query.toLowerCase();
  return ASSET_LIBRARY.filter(asset => 
    asset.name.toLowerCase().includes(lowerQuery) ||
    asset.symbol.toLowerCase().includes(lowerQuery) ||
    asset.description.toLowerCase().includes(lowerQuery)
  ).slice(0, 20); // Limit to 20 results
};

export const getCryptoAssets = () => {
  return ASSET_LIBRARY.filter(asset => asset.type === 'crypto');
};

export const getStockAssets = () => {
  return ASSET_LIBRARY.filter(asset => asset.type === 'stock');
};

