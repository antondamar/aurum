import React from 'react';

export default function Performance({ 
  sortedAssets, 
  totalPnL, 
  totalCostBasis, 
  currency, 
  formatValue,
  getAssetInfo 
}) {
  return (
    <div className="aurum-card p-8 rounded-3xl w-full">
      <div className="flex justify-between items-center mb-10">
        <h3 className="font-bold text-sm text-zinc-500 tracking-widest uppercase">
          Profit & Loss <span className="text-zinc-700 ml-2">/ Performance</span>
        </h3>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total PnL</p>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatValue(totalPnL, currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total Cost Basis</p>
            <p className="text-2xl font-bold text-white">
              {formatValue(totalCostBasis, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center tabular-nums border-collapse">
          <thead className="text-zinc-600 text-[10px] tracking-widest uppercase border-b border-zinc-900">
            <tr>
              <th className="pb-4 w-1/6 text-left pl-6">Asset</th>
              <th className="pb-4 w-1/6">PnL</th>
              <th className="pb-4 w-1/6">PnL %</th>
              <th className="pb-4 w-1/6">Cost Basis</th>
              <th className="pb-4 w-1/6">Current Value</th>
              <th className="pb-4 w/6">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {sortedAssets.length > 0 ? (
              sortedAssets.map((asset) => {
                const costBasis = asset.avgBuy * asset.amount;
                const currentValue = asset.value;
                const pnl = currentValue - costBasis;
                const pnlPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                
                return (
                  <tr key={asset.id} className="hover:bg-white/[0.01]">
                    <td className="py-6 pl-6 text-left">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: asset.color }}
                        />
                        <div>
                          <span className="font-medium text-white">{asset.name}</span>
                          {getAssetInfo(asset.name)?.type === 'crypto' && (
                            <span className="text-xs text-[#D3AC2C] ml-2">● Live</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`py-6 font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatValue(pnl, currency)}
                    </td>
                    <td className={`py-6 font-semibold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                    </td>
                    <td className="py-6 text-zinc-400">{formatValue(costBasis, currency)}</td>
                    <td className="py-6 text-white">{formatValue(currentValue, currency)}</td>
                    <td className="py-6">
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(Math.abs(pnlPercentage), 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs mt-1 ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '↗' : '↘'} {Math.abs(pnlPercentage).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-12 text-center text-zinc-500">
                  <p className="text-lg">No performance data available.</p>
                  <p className="text-sm mt-2">Add assets to see PnL calculations.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}