import React, { useState, useEffect } from 'react';

const Dashboard = ({ profileData }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      // Get current time in EDT (Eastern Time)
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto', // EDT/EST Timezone
        hour: 'numeric',
        hour12: false,
      });
      
      const hour = parseInt(formatter.format(now));

      if (hour >= 5 && hour < 12) setGreeting('Good Morning');
      else if (hour >= 12 && hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };

    updateGreeting();
    // Update every minute in case the hour changes while the tab is open
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto pt-24">
      {/* Header Section */}
      <header className="mb-10">
        {/* Greetings First */}
        <h1 className="text-5xl font-extrabold tracking-tighter text-white">
          {greeting}, <span className="gold-text">{profileData.firstName || 'Investor'}</span>
        </h1>
        {/* Investment Overview Moved Below */}
        <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold mt-2">
          Investment Overview
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Total Net Worth</p>
          <h2 className="text-3xl font-bold mt-2">$124,500.00</h2>
          <span className="text-emerald-400 text-sm font-medium">↑ 12.5% this month</span>
        </div>
        
        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Active Assets</p>
          <h2 className="text-3xl font-bold mt-2">14</h2>
          <p className="text-zinc-500 text-xs mt-1 italic">Across 3 Platforms</p>
        </div>

        <div className="aurum-card p-6 rounded-2xl">
          <p className="text-zinc-400 text-sm">Dividends (YTD)</p>
          <h2 className="text-3xl font-bold mt-2 gold-text">$1,240.55</h2>
        </div>
      </div>

      {/* Asset Table Placeholder */}
      <div className="aurum-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="font-bold text-lg">Portfolio Holdings</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white/5 text-zinc-400 text-xs uppercase">
            <tr>
              <th className="p-4">Asset</th>
              <th className="p-4">Allocation</th>
              <th className="p-4">Value</th>
              <th className="p-4">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-semibold">Bitcoin (BTC)</td>
              <td className="p-4">45%</td>
              <td className="p-4">$56,025.00</td>
              <td className="p-4 text-emerald-400">+4.2%</td>
            </tr>
            <tr className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-semibold">S&P 500 ETF</td>
              <td className="p-4">30%</td>
              <td className="p-4">$37,350.00</td>
              <td className="p-4 text-zinc-400">0.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;