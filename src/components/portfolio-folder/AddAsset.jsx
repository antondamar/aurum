import React from 'react';

export default function AddAsset({
  newAsset,
  setNewAsset,
  handleAddAsset,
  isAddingNewAsset,
  setIsAddingNewAsset,
  newAssetName,
  setNewAssetName,
  addNewAssetToMasterList,
  assetSearchQuery,
  setAssetSearchQuery,
  searchResults,
  getAssetInfo,
  ASSET_LIBRARY,
  COLOR_OPTIONS
}) {
  return (
    <div className="aurum-card p-10 rounded-[2rem]">
      <h3 className="text-2xl font-bold mb-8 tracking-tighter">Register new position</h3>
      <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* ASSET SELECTION & SEARCH */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Asset</label>
          
          {isAddingNewAsset ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Custom asset name..."
                className="bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNewAssetToMasterList()}
              />
              <div className="flex gap-2">
                <button type="button" onClick={addNewAssetToMasterList} className="flex-1 bg-green-500/20 text-green-500 py-2 rounded-lg text-xs font-bold">Add Custom</button>
                <button type="button" onClick={() => { setIsAddingNewAsset(false); setAssetSearchQuery(''); }} className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-lg text-xs font-bold">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <select 
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
                value={newAsset.name}
                onChange={(e) => {
                  if (e.target.value === "new-asset") {
                    setIsAddingNewAsset(true);
                  } else {
                    const info = getAssetInfo(e.target.value);
                    setNewAsset({ ...newAsset, name: info?.name || e.target.value, color: info?.color || COLOR_OPTIONS[0] });
                  }
                }}
              >
                <optgroup label="Cryptocurrencies">
                  {ASSET_LIBRARY.filter(a => a.type === 'crypto').map(a => <option key={a.id} value={a.name}>{a.name} ({a.symbol})</option>)}
                </optgroup>
                <optgroup label="Stocks">
                  {ASSET_LIBRARY.filter(a => a.type === 'stock').map(a => <option key={a.id} value={a.name}>{a.name} ({a.symbol})</option>)}
                </optgroup>
                <optgroup label="Cash & Currencies">
                  {ASSET_LIBRARY.filter(a => a.type === 'cash').map(a => <option key={a.id} value={a.name}>{a.name} ({a.symbol})</option>)}
                </optgroup>
                <option value="new-asset" className="text-green-500 font-bold bg-black">+ Add Custom Asset</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search (BTC, BBCA...)"
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                />
                {assetSearchQuery && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                    {searchResults.map(asset => (
                      <div key={asset.id} className="p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0" onClick={() => { setNewAsset({ ...newAsset, name: asset.name, color: asset.color || COLOR_OPTIONS[0] }); setAssetSearchQuery(''); }}>
                        <div className="flex justify-between items-center">
                          <div><p className="font-bold text-white">{asset.name}</p><p className="text-xs text-zinc-400">{asset.symbol} • {asset.category}</p></div>
                          <span className="text-xs px-2 py-1 rounded bg-white/5 text-zinc-400">{asset.type.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CURRENCY & TYPE */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Currency</label>
          <select 
            className="bg-black border border-zinc-800 p-4 rounded-xl text-sm focus:border-[#D3AC2C] outline-none font-bold text-white"
            value={newAsset.currency}
            onChange={(e) => setNewAsset({...newAsset, currency: e.target.value})}
          >
            <option value="USD">USD ($)</option>
            <option value="CAD">CAD ($)</option>
            <option value="IDR">IDR (Rp)</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Type</label>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1">
            <button 
              type="button" 
              onClick={() => setNewAsset({...newAsset, type: 'BUY'})} 
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newAsset.type === 'BUY' ? 'bg-[#22C55E] text-black border border-white/5 hover:bg-[#1da84f] active:scale-[0.98]' : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:bg-zinc-900/70'}`}
            >
              BUY
            </button>

            <button 
              type="button" 
              onClick={() => setNewAsset({...newAsset, type: 'SELL'})} 
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newAsset.type === 'SELL' ? 'bg-[#EF4444] text-black border border-white/5 hover:bg-[#dc2626] active:scale-[0.98]' : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:bg-zinc-900/70'}`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* INPUTS: PRICE, AMOUNT, DATE */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Buy Price</label>
          <input type="text" placeholder="0.00" className="bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white font-bold outline-none focus:border-[#D3AC2C]" value={newAsset.buyPrice} onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ''); if ((val.match(/\./g) || []).length <= 1) setNewAsset({ ...newAsset, buyPrice: val }); }} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Amount</label>
          <input type="text" placeholder="0.00" className="bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white font-bold outline-none focus:border-[#D3AC2C]" value={newAsset.amount} onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ''); if ((val.match(/\./g) || []).length <= 1) setNewAsset({ ...newAsset, amount: val }); }} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Purchase Date</label>
          <input 
            type="date" 
            className="bg-black border border-zinc-800 p-4 rounded-xl text-sm text-white font-bold outline-none focus:border-[#D3AC2C]"
            value={newAsset.purchaseDate} 
            onChange={(e) => {
              // Force the value to a clean string to avoid browser locale interference
              const rawDate = e.target.value; 
              if (!rawDate) return;
              
              // Ensure it is strictly YYYY-MM-DD before updating state
              const cleanDate = new Date(rawDate).toISOString().split('T')[0];
              setNewAsset({ ...newAsset, purchaseDate: cleanDate });
            }} 
          />
        </div>

        {/* SUBMIT */}
        <div className="lg:col-span-4 flex justify-end">
          <button 
            type="submit" 
            className="relative overflow-hidden bg-[#D3AC2C] text-black font-bold px-10 py-4 rounded-full 
                      transition-all border border-white/5
                      hover:bg-[#af902b] active:scale-[0.98] active:bg-[#D3AC2C] "
            disabled={!newAsset.name || !newAsset.buyPrice || !newAsset.amount}
          >
            Add to Portfolio
          </button>
        </div>
      </form>
    </div>
  );
}