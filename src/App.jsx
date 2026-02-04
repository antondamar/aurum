import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Komponen Pendukung
import Navbar from './components/Navbar';
import Dashboard from './components/home-folder/Dashboard';
import LiquidBackground from './components/MovingBackground';
import Portfolio from './components/portfolio-folder/Portfolio';
import AssetHistory from './components/portfolio-folder/AssetHistory';
import Auth from './components/account-folder/Auth'; 
import Profile from './components/account-folder/Profile';
import ScrollToTop from './components/ScrollToTop';
import ProfileUpdateAlert from './components/account-folder/ProfileUpdateAlert';
import ToolsGrid from './components/tools-folder/ToolsGrid';
import GoalPriceTool from './components/tools-folder/GoalPriceTool'
import AllocationPlanner from './components/tools-folder/AllocationPlanner'
import Insights from './components/insights-folder/Insights';
import RiskAssessmentTool from './components/tools-folder/RiskAssessmentTool';

// Komponen Footer
const Footer = () => {
  const location = useLocation();
  if (location.pathname.includes('/asset/')) return null;
  return (
    <footer className="mt-10 pb-6 border-t border-zinc-900 pt-4 relative z-10">
      <div className="flex justify-center items-center">
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
          © 2026 FERREL HIMAWAN HANDOYO. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(localStorage.getItem('currentView') || 'Home');
  
  // --- DATA STATE ---
  const [assetMasterList, setAssetMasterList] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [profileData, setProfileData] = useState({ username: '', firstName: '', lastName: '' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
  const fetchInitialRates = async () => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      setRates(data.rates || {});
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    }
  };
  
  fetchInitialRates();
}, []);

  // Add a useEffect to save the view whenever it changes
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Generate a unique ID for this tab
  useEffect(() => {
    if (!sessionStorage.getItem('tabId')) {
      const tabId = 'tab-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('tabId', tabId);
    }
  }, []);

  // 1. MONITOR STATUS LOGIN - WITH DEBUG LOGS
  useEffect(() => {
    console.log("App.jsx: useEffect for auth started");
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser ? `User: ${currentUser.email}` : "No user");
      
      if (currentUser) {
        console.log("User logged in, fetching data...");
        // Check if this is a fresh login or just a refresh
        const isSessionActive = sessionStorage.getItem('isSessionActive');

        if (!isSessionActive) {
          // --- FRESH LOGIN CASE ---
          // Force the user to the Home page
          setCurrentView('Home');
          localStorage.setItem('currentView', 'Home');
          // Mark the session as active so refreshes don't trigger this again
          sessionStorage.setItem('isSessionActive', 'true');
        }
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("User data loaded:", data);
            
            // ONLY set portfolios and assetMasterList here
            // DO NOT overwrite profileData that might have been updated elsewhere
            setPortfolios(data.portfolios || []);
            setAssetMasterList(data.assetMasterList || []);
            
            // Only set profile data if it's not already set
            setProfileData(prev => ({
              username: prev.username || data.username || '',
              firstName: prev.firstName || data.firstName || '',
              lastName: prev.lastName || data.lastName || ''
            }));
          } else {
            console.log("New user, creating empty data...");
            const initialData = {
              portfolios: [],
              assetMasterList: [],
              lastUpdated: new Date().toISOString()
            };
            await setDoc(docRef, initialData);
            setPortfolios([]);
            setAssetMasterList([]);
          }
          setIsDataLoaded(true);
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        console.log("User logged out, clearing data");
        setPortfolios([]);
        setAssetMasterList([]);
        setProfileData({ username: '', firstName: '', lastName: '' });
        setCurrentView('Home');
        sessionStorage.removeItem('isSessionActive');
        localStorage.setItem('currentView', 'Home');
      }
      
      setUser(currentUser);
      setLoading(false);
      console.log("Loading set to false");
    });
    
    return () => {
      console.log("App.jsx: cleanup auth listener");
      unsubscribe();
    };
  }, []);

  // Add this debug effect to monitor state
  useEffect(() => {
    console.log("Current state:", {
      loading,
      user: user ? `User: ${user.email}` : "No user",
      portfoliosCount: portfolios.length,
      assetMasterListCount: assetMasterList.length
    });
  }, [loading, user, portfolios, assetMasterList]);

  // --- CONSOLIDATED CLOUD SYNC (UPDATED) ---
  useEffect(() => {
    const syncData = async () => {
      if (user && isDataLoaded) { 
        const currentTabId = sessionStorage.getItem('tabId');
        
        try {
          const docRef = doc(db, "users", user.uid);
          await setDoc(docRef, {
            portfolios,
            assetMasterList,
            ...profileData,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentTabId // TAG THE UPDATE WITH THIS TAB'S ID
          }, { merge: true });
        } catch (error) {
          console.error("Cloud Sync Error:", error);
        }
      }
    };

    const hasChanges = portfolios.length > 0 || assetMasterList.length > 0 || 
                      profileData.username || profileData.firstName || profileData.lastName;
    
    if (hasChanges) {
      const timeoutId = setTimeout(syncData, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [portfolios, assetMasterList, profileData, user, isDataLoaded]);

  // Layar Loading Awal
  // Change your loading check to add a timeout:
  const [initialLoadTimeout, setInitialLoadTimeout] = useState(false);

  useEffect(() => {
    // If loading takes more than 5 seconds, force it to stop
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout - forcing stop");
        setLoading(false);
        setInitialLoadTimeout(true);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [loading]);
  

  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({ USD: 1, CAD: 1.35, IDR: 15600 });

  // Tambahkan useEffect ini di App.jsx untuk update kurs secara global
  useEffect(() => {
    const updateRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data.result === "success") {
          setRates({ USD: 1, CAD: data.rates.CAD, IDR: data.rates.IDR });
        }
      } catch (err) {
        console.error("Gagal update kurs di App.jsx");
      }
    };
    updateRates();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const currentTabId = sessionStorage.getItem('tabId');
    
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const freshData = docSnapshot.data();
        
        // GUARD: Only update if the change came from a DIFFERENT tab
        if (freshData.updatedBy !== currentTabId) {
          console.log("🔄 Syncing all data from another tab");
          
          // Update everything to match the cloud (Tab A's state)
          setPortfolios(freshData.portfolios || []);
          setAssetMasterList(freshData.assetMasterList || []);
          setProfileData({
            username: freshData.username || '',
            firstName: freshData.firstName || '',
            lastName: freshData.lastName || ''
          });
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Layar Loading Awal - UPDATED
  if (loading && !initialLoadTimeout) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <p className="text-3xl font-extrabold tracking-tighter text-[#ffffff] animate-pulse">Loading <span className="text-[#D3AC2C]">Aurum</span>...</p>
      </div>
    );
  }

  // If timeout occurred but still loading, show error
  if (initialLoadTimeout) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center">
        <p className="text-[#D3AC2C] font-bold tracking-widest text-xl mb-4">LOADING TIMEOUT</p>
        <p className="text-zinc-400 mb-6">Authentication is taking too long.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#D3AC2C] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#A57A03] transition-all"
        >
          Reload Page
        </button>
        <p className="text-zinc-600 text-xs mt-6">Check browser console for errors (F12)</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ProfileUpdateAlert />
      <div className="min-h-screen text-white font-sans relative overflow-x-hidden">
        <LiquidBackground />
        
        {/* LOGIKA AUTH: Sekarang berada DI DALAM BrowserRouter agar tidak blank/crash */}
        {!user ? (
          <main className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col min-h-screen">
            <div className="flex-grow flex items-center justify-center">
              <Auth />
            </div>
            <Footer />
          </main>
        ) : (
          <>
          {currentView === 'Home' && window.location.pathname !== '/' && (
            <Navigate to="/" replace={true} />
          )}
          <Navbar setView={setCurrentView} currentView={currentView} profileData={profileData} />
            <main className="max-w-6xl mx-auto px-6 pb-0 relative z-10">
            <Routes>
              <Route path="/" element={
                currentView === 'Home' ? (
                  <>
                    <Dashboard portfolios={portfolios} profileData={profileData} />
                    <div className="mt-32 mb-10 flex flex-col items-center text-center">
                      <p className="text-xl text-zinc-400 italic tracking-wide font-light max-w-2xl">
                        "Be fearful when others are greedy and greedy only when others are fearful."
                      </p>
                      <span className="mt-4 text-zinc-500 font-bold uppercase text-[12px] tracking-[0.3em]">
                        — Warren Buffett
                      </span>
                    </div>
                  </>
                ) : currentView === 'Portfolio' ? (
                  <Portfolio 
                    portfolios={portfolios} 
                    setPortfolios={setPortfolios} 
                    assetMasterList={assetMasterList}
                    setAssetMasterList={setAssetMasterList}
                    currency={currency}
                    setCurrency={setCurrency}
                    rates={rates}
                  />
                ) : currentView === 'Profile' ? (
                    <Profile profileData={profileData} setProfileData={setProfileData} />
                ) : currentView === 'Tools' ? (
                    <ToolsGrid setView={setCurrentView} />
                ) : currentView.startsWith('Tool_') ? (
                    <div className="animate-in slide-in-from-right duration-300">
                      <button
                        onClick={() => setCurrentView('Tools')}
                        className="group flex mt-10 mb-10 items-center gap-2 text-zinc-500 hover:text-[#D3AC2C] transition-all cursor-pointer"
                      >
                        <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#D3AC2C]/10 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                        </div>
                        <span className="font-bold uppercase tracking-widest text-xs">Back to Workshop</span>
                      </button>
                      
                      {/* Conditional Tool Components */}
                        {currentView === 'Tool_goal' && <GoalPriceTool 
                          portfolios={portfolios} 
                          rates={rates} 
                          currency={currency} 
                          setView={setCurrentView} 
                        />}
                        {currentView === 'Tool_rebalance' && <AllocationPlanner portfolios={portfolios} rates={rates} currency={currency} setView={setCurrentView} />}
                        {currentView === 'Tool_risk' && <RiskAssessmentTool portfolios={portfolios} />}
                      </div>
                ) : currentView === 'Insights' ? (
                    <Insights 
                      rates={rates} 
                      currency={currency} 
                    />
                ) : (
                  /* Tampilan Soon untuk Insights, Tools, dan Settings */
                  <div className="h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                    <h1 className="text-7xl font-extrabold tracking-tighter text-white">
                      {currentView} <span className="text-zinc-700">/ Soon</span>
                    </h1>
                  </div>
                )
              } />

                {/* Route Langsung ke Portfolio */}
                <Route path="/portfolio" element={
                  <Portfolio 
                    portfolios={portfolios} 
                    setPortfolios={setPortfolios} 
                    assetMasterList={assetMasterList}
                    setAssetMasterList={setAssetMasterList}
                    currency={currency}
                    setCurrency={setCurrency}
                    rates={rates}
                  />
                } />

                {/* Route ke Detail Asset (800 baris kode kamu tetap aman di sini) */}
                <Route 
                  path="/portfolio/:portfolioId/asset/:assetId" 
                  element={
                    <AssetHistory 
                      portfolios={portfolios} 
                      setPortfolios={setPortfolios}
                      currency={currency}
                      setCurrency={setCurrency}
                      rates={rates}
                    />
                  } 
                />
                <Route 
                  path="/insights/:symbol" 
                  element={
                    <Insights 
                      rates={rates} 
                      currency={currency} 
                    />
                  } 
                />
                {/* Fallback jika route tidak ditemukan */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              <Footer />
            </main>
          </>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;