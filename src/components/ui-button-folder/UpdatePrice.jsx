import React from 'react';

export default function UpdatePrice({ 
  priceUpdateTime, 
  updateAllPrices, 
  isUpdatingPrices, 
  assetCount 
}) {
  return (
    <div className="mb-6 flex justify-between items-center">
      {/* UPDATE TIME STATUS */}
      <div className="text-xs text-zinc-500">
        {priceUpdateTime ? (
          <span>Prices updated: {priceUpdateTime}</span>
        ) : (
          <span>Click "Update Prices" to fetch latest prices</span>
        )}
      </div>

      {/* METALLIC UPDATE BUTTON */}
      <button
        onClick={updateAllPrices}
        disabled={isUpdatingPrices || assetCount === 0}
        className="relative overflow-hidden bg-gradient-to-br from-[#F9E08B] via-[#D3AC2C] to-[#A57A03] 
           text-black text-xs font-bold px-4 py-2 rounded-lg transition-all 
           disabled:opacity-50 flex items-center gap-2 hover:brightness-110 
           active:scale-[0.98] shadow-lg shadow-[#D3AC2C]/20 border border-[#F9E08B]/30
           before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent 
           before:via-white/20 before:to-transparent before:translate-x-[-100%] 
           hover:before:translate-x-[100%] before:transition-transform before:duration-700"
      >
        {isUpdatingPrices ? (
          <>
            <div className="w-2 h-2 bg-[#D3AC2C] rounded-full animate-pulse"></div>
            Updating...
          </>
        ) : (
          '↻ Update Prices'
        )}
      </button>
    </div>
  );
}