import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth'; 

export default function Navbar({ setView, currentView, profileData }) {
  const navigate = useNavigate(); // ✅ Buat navigate function
  const navItems = ["Home", "Portfolio", "Insights", "Tools", "Settings"];
  const userInitial = profileData?.username?.[0]?.toUpperCase() || 
                     auth.currentUser?.email?.[0]?.toUpperCase() || 
                     "U";
  const username = profileData?.username || 'user';
  const [isExploding, setIsExploding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const handleLogoClick = () => {
    // 1. Trigger animasi ledakan
    setIsExploding(true);
    // 2. Reset trigger setelah animasi selesai (500ms)
    setTimeout(() => setIsExploding(false), 500);
    
    // 3. Logika navigasi yang sudah ada
    navigate('/');
    setView('Home');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); // Navigasi ke homepage setelah logout
      setShowDropdown(false); // Tutup dropdown
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="relative top-0 left-0 w-full z-50 border-b border-black bg-black/80 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
      
    {/* Logo Container dengan Animasi Ledakan */}
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {isExploding && (
            <>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{ 
                    scale: [0, 1, 0.5, 0], // Membesar lalu mengecil
                    x: (Math.random() - 0.5) * 150, // Pancaran acak horizontal
                    y: (Math.random() - 0.5) * 150, // Pancaran acak vertikal
                    opacity: 0 
                  }}
                  transition={{ duration: 0.7, ease: "circOut" }}
                  className="absolute w-2 h-2 bg-[#D3AC2C] rounded-full blur-[1px] z-0"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <button 
          onClick={handleLogoClick}
          className="relative z-10 text-[#D3AC2C] font-black text-xl tracking-tighter hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          aria-label="Go to homepage"
        >
          Au
        </button>
      </div>

      {/* navigation bar */}
      <div className="flex gap-10 absolute left-1/2 -translate-x-1/2">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => {
              setView(item);
              if (item === 'Home') {
                navigate('/'); // ✅ Navigasi ke homepage jika Home diklik
              }
            }}
            className={`text-[13px] font-medium transition-colors duration-200 ${
              currentView === item ? 'text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* profile button dengan dropdown */}
      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 group"
        >
          <span className="text-zinc-500 text-xs font-bold group-hover:text-[#D3AC2C]">
            @{username}
          </span>
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-white font-black group-hover:border-[#D3AC2C]">
            {userInitial}
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-white text-sm font-bold truncate">{auth.currentUser?.email}</p>
              <p className="text-zinc-400 text-xs">@{username}</p>
            </div>
            
            <button
              onClick={() => {
                setView('Profile');
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Edit Profile</span>
              </div>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors text-red-400 hover:text-red-300"
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Overlay untuk menutup dropdown saat klik di luar */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </nav>
  );
}