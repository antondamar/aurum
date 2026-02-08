import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function CurrentHoldings({
  activePortfolioName,
  activePortfolioId,
  sortedAssets,
  totalValue,
  getCurrentPrice,
  formatValue,
  currency,
  setCurrency,
  COLOR_OPTIONS,
  updateAssetColor,
  getAssetColor
}) {
  const navigate = useNavigate();
  const [hoveredCurrency, setHoveredCurrency] = useState(null);
  const [isHoveringSwitcher, setIsHoveringSwitcher] = useState(false);
  const [editingColorForAsset, setEditingColorForAsset] = useState(null);

  return (
    <div className="aurum-card p-8 rounded-3xl w-full">
      <div className="flex justify-between items-center mb-10">
        <h3 className="font-bold text-sm text-zinc-500 tracking-widest uppercase">
          {activePortfolioName} <span className="text-zinc-700 ml-2">/ Current Holdings</span>
        </h3>
        
        {/* CURRENCY SWITCHER */}
        <div 
          className="relative flex bg-zinc-900/50 p-1 rounded-full border border-white/5"
          onMouseEnter={() => setIsHoveringSwitcher(true)}
          onMouseLeave={() => {
            setIsHoveringSwitcher(false);
            setHoveredCurrency(null);
          }}
        >
          {['USD', 'CAD', 'IDR'].map((curr) => (
            <div 
              key={curr} 
              className="relative px-6 py-2 cursor-pointer z-10" 
              onMouseEnter={() => setHoveredCurrency(curr)} 
              onClick={() => setCurrency(curr)}
            >
              <span className={`text-xs font-bold transition-colors duration-200 ${ 
                (isHoveringSwitcher ? hoveredCurrency === curr : currency === curr) ? 'text-black' : 'text-zinc-500' 
              }`}>
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
          <thead className="text-zinc-400 text-[10px] tracking-widest uppercase border-b border-zinc-900">
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
                    <td className="py-6 font-medium text-white group-hover:text-[#D3AC2C] transition-colors">
                      {item.name}
                    </td>

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
                          <div 
                            className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[250px]" 
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="grid grid-cols-5 gap-2">
                              {COLOR_OPTIONS.map(color => (
                                <button
                                  key={color}
                                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white transition-all"
                                  style={{ backgroundColor: color }}
                                  onClick={() => {
                                    updateAssetColor(item.name, color);
                                    setEditingColorForAsset(null);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-6 text-zinc-400 font-bold">{allocation.toFixed(1)}%</td>
                    <td className="py-6 text-white font-bold">
                      {Number(parseFloat(item.amount).toFixed(8))}
                    </td>
                    <td className="py-6 text-[#D3AC2C] font-bold">{formatValue(currentPrice, currency)}</td>
                    <td className="py-6 text-white font-bold">{formatValue(item.value, currency)}</td>
                    <td className="py-6 text-zinc-500">
                      {formatValue(item.avgBuy, currency, false)} 
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="py-12 text-center text-zinc-500">
                  <p className="text-lg italic tracking-tighter">No assets found in this portfolio.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}