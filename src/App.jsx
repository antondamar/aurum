import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Komponen Pendukung
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LiquidBackground from './components/LiquidBackground';
import Portfolio from './components/Portfolio';
import AssetHistory from './components/AssetHistory';
import Auth from './components/Auth'; 
import Profile from './components/Profile';

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
  const [currentView, setCurrentView] = useState('Home');

  // --- DATA STATE ---
  const [assetMasterList, setAssetMasterList] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [profileData, setProfileData] = useState({ username: '', firstName: '', lastName: '' });

  // 1. MONITOR STATUS LOGIN - WITH DEBUG LOGS
  useEffect(() => {
    console.log("App.jsx: useEffect for auth started");
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser ? `User: ${currentUser.email}` : "No user");
      
      if (currentUser) {
        console.log("User logged in, fetching data...");
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Existing user: load their data
            const data = docSnap.data();
            console.log("User data loaded:", data);
            setPortfolios(data.portfolios || []);
            setAssetMasterList(data.assetMasterList || []);
            setProfileData({
              username: data.username || '',
              firstName: data.firstName || '',
              lastName: data.lastName || ''
            });
          } else {
            // New user: initialize with empty data
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
        // User logged out
        console.log("User logged out, clearing data");
        setPortfolios([]);
        setAssetMasterList([]);
      }
      
      setUser(currentUser);
      setLoading(false);
      console.log("Loading set to false");
    });
    // Check initial auth state immediately
    console.log("Checking initial auth state...");
    
    return () => {
      console.log("App.jsx: cleanup auth listener");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncData = async () => {
      // HANYA simpan jika data sudah selesai di-load dari cloud
      if (user && isDataLoaded) { 
        console.log("Saving changes to Firestore...");
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, {
          portfolios,
          assetMasterList,
          ...profileData,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
    };
    syncData();
  }, [portfolios, assetMasterList, profileData, user, isDataLoaded]);
    

  // Add this debug effect to monitor state
  useEffect(() => {
    console.log("Current state:", {
      loading,
      user: user ? `User: ${user.email}` : "No user",
      portfoliosCount: portfolios.length,
      assetMasterListCount: assetMasterList.length
    });
  }, [loading, user, portfolios, assetMasterList]);

  useEffect(() => {
    const syncData = async () => {
      if (user && isDataLoaded) { 
        console.log("Saving changes to Firestore...");
        try {
          const docRef = doc(db, "users", user.uid);
          await setDoc(docRef, {
            portfolios,
            assetMasterList,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
          console.log("Data saved successfully!");
        } catch (error) {
          console.error("Error saving to Firestore:", error);
        }
      }
    };
    syncData();
  }, [portfolios, assetMasterList, user, isDataLoaded]);

  useEffect(() => {
    const syncData = async () => {
      if (user && isDataLoaded) { 
        console.log("Attempting to save data:", {
          user: user.email,
          portfoliosCount: portfolios.length,
          assetMasterListCount: assetMasterList.length,
          isDataLoaded
        });
        
        try {
          const docRef = doc(db, "users", user.uid);
          await setDoc(docRef, {
            portfolios,
            assetMasterList,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
          console.log("✅ Data saved successfully to Firestore!");
        } catch (error) {
          console.error("❌ Error saving to Firestore:", error);
          console.error("Error details:", error.code, error.message);
        }
      } else {
        console.log("Not saving because:", { 
          user: !!user, 
          isDataLoaded,
          reason: !user ? "No user" : "Data not loaded yet"
        });
      }
    };
    syncData();
  }, [portfolios, assetMasterList, user, isDataLoaded]);


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
                ) : (
                  /* Tampilan Soon untuk Insights, Tools, dan Settings */
                  <div className="h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                    <h1 className="text-7xl font-extrabold tracking-tighter text-white">
                      {currentView} <span className="text-zinc-700">/ Soon</span>
                    </h1>
                    <p className="text-zinc-500 mt-4 tracking-widest uppercase text-xs font-bold">
                      Section under development
                    </p>
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