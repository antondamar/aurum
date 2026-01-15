import React, { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ProfileUpdateAlert = () => {
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, "users", auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const currentTabId = sessionStorage.getItem('tabId');
        const updateSource = localStorage.getItem('lastProfileUpdateSource');
        
        // Show alert only if the update came from a DIFFERENT tab
        if (updateSource && updateSource !== currentTabId) {
          setShowAlert(true);
          
          // Hide alert after 5 seconds instead of reloading
          setTimeout(() => setShowAlert(false), 5000);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!showAlert) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-[#D3AC2C] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-[#D3AC2C]/10 p-2 rounded-lg">
        <svg className="text-[#D3AC2C]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/></svg>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest">Cloud Sync</p>
        <p className="text-[11px] text-zinc-400">Profile updated from another device.</p>
      </div>
      <button onClick={() => setShowAlert(false)} className="text-zinc-500 hover:text-white text-xs ml-2">✕</button>
    </div>
  );
};

export default ProfileUpdateAlert;