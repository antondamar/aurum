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
        className="relative overflow-hidden bg-[#D3AC2C] text-[13px] font-bold px-4 py-2 rounded-full 
                  transition-all disabled:opacity-50 flex items-center gap-2 border border-white/5
                  hover:bg-[#af902b] active:scale-[0.98] text-black"
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