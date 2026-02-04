import React from 'react';

const tools = [
  { id: 'goal', title: 'Goal Price', desc: "See your portfolio value at different prices." },
  { id: 'rebalance', title: 'Allocation Planner', desc: 'Rebalance your portfolio to target %.' },
  { id: 'risk', title: 'Risk Profile', desc: 'Know yourself before investing.' },
//   { id: 'mcap', title: 'Market Cap Compare', desc: 'Compare asset prices by market cap.' },
//   { id: 'fire', title: 'FIRE Calculator', desc: 'Estimate your retirement timeline.' },
//   { id: 'fees', title: 'Fee & Tax Impact', desc: 'See how much fees affect your gains.' },
];

const ToolsGrid = ({ setView }) => {
  return (
    <div className="animate-in fade-in zoom-in duration-500">
      <h2 className="text-5xl font-black tracking-tighter mt-10 mb-10 text-white">
        Financial <span className="gold-text">Workshop</span>
      </h2>
      
      {/* Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div 
            key={tool.id}
            onClick={() => setView(`Tool_${tool.id}`)}
            className="aurum-card p-8 rounded-[2rem] cursor-pointer hover:border-[#D3AC2C]/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D3AC2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#D3AC2C]">{tool.title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{tool.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsGrid;