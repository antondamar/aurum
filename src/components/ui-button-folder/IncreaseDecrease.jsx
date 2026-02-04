import React from 'react';

export default function IncreaseDecrease({ value, setter, step = 1, decimals = 2 }) {
  const handleUpdate = (newValue) => {
    const val = parseFloat(newValue);
    setter(isNaN(val) ? 0 : Math.max(0, val));
  };

  return (
    <div className="inline-flex items-center bg-black border border-zinc-700 rounded-lg px-2 py-1">
      <div className="flex items-center justify-center gap-2">
        <button 
          onClick={() => handleUpdate((parseFloat(value) || 0) - step)}
          className="w-6 h-6 rounded-md bg-zinc-800 text-white flex items-center justify-center hover:bg-red-500/20 transition-all font-bold"
        >
          -
        </button>

        <input 
          type="number"
          value={value || ''}
          step={step}
          className="bg-transparent w-24 text-[#D3AC2C] font-bold text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm"
          onChange={(e) => handleUpdate(e.target.value)}
        />

        <button 
          onClick={() => handleUpdate((parseFloat(value) || 0) + step)}
          className="w-6 h-6 rounded-md bg-zinc-800 text-white flex items-center justify-center hover:bg-green-500/20 transition-all font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}