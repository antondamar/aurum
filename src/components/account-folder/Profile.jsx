import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../../firebase'; 

const Profile = ({ profileData, setProfileData }) => {
  const [formData, setFormData] = useState(profileData);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [oldUsername, setOldUsername] = useState(profileData.username);
  const [lastServerUpdate, setLastServerUpdate] = useState(null);
  
  // Use refs to track state
  const isSavingRef = useRef(false);

  // Listen for external changes (other tabs/windows)
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const serverData = docSnapshot.data();
        const serverTimestamp = serverData.lastUpdated;
        
        // Skip if we're currently saving (avoid reacting to our own save)
        if (isSavingRef.current) return;
        
        // If server data is different from our local form
        if (serverData.username !== formData.username ||
            serverData.firstName !== formData.firstName ||
            serverData.lastName !== formData.lastName) {
          
          // Check if server data is newer
          if (!lastServerUpdate || new Date(serverTimestamp) > new Date(lastServerUpdate)) {
            console.log("🔄 Profile updated externally, refreshing...");
            
            // Update form with server data
            setFormData({
              username: serverData.username || '',
              firstName: serverData.firstName || '',
              lastName: serverData.lastName || ''
            });
            
            // Update parent state
            setProfileData({
              username: serverData.username || '',
              firstName: serverData.firstName || '',
              lastName: serverData.lastName || ''
            });
            
            setLastServerUpdate(serverTimestamp);
            
            // Show warning
            setError('Profile was updated in another tab/window. Form refreshed.');
            setTimeout(() => setError(''), 5000);
          }
        }
        
        // Always update lastServerUpdate
        setLastServerUpdate(serverTimestamp);
      }
    });
    
    return () => unsubscribe();
  }, [auth.currentUser, formData, lastServerUpdate]);

  const handleUpdate = async () => {
    setError('');
    setSuccess('');
    const newUsername = formData.username.trim().toLowerCase();
    const currentTabId = sessionStorage.getItem('tabId'); // Get current tab ID

    // 1. Mark this tab as the source BEFORE saving
    localStorage.setItem('lastProfileUpdateSource', currentTabId);

    isSavingRef.current = true;

    try {
      setIsChecking(true);
      
      // Username Availability Check (only if changed)
      if (newUsername !== oldUsername) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", newUsername));
        const querySnapshot = await getDocs(q);
        const isTakenByOthers = querySnapshot.docs.some(doc => doc.id !== auth.currentUser.uid);
        
        if (isTakenByOthers) {
          setError(`Username "${newUsername}" is already taken.`);
          setIsChecking(false);
          isSavingRef.current = false;
          return;
        }
      }

      // Create update payload with timestamp
    const updatePayload = { 
      username: newUsername,
      firstName: formData.firstName,
      lastName: formData.lastName,
      lastUpdated: new Date().toISOString()
    };

    const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, updatePayload, { merge: true });

      // Update local states
      setProfileData(prev => ({ ...prev, ...updatePayload }));
      setFormData(prev => ({ ...prev, ...updatePayload }));
      setOldUsername(newUsername);
      setSuccess('Profile updated successfully!');
      
    } catch (err) {
      setError("Update Error: " + err.message); 
      // If error, clear the source so other tabs aren't blocked
      localStorage.removeItem('lastProfileUpdateSource');
    } finally {
      setIsChecking(false);
      setTimeout(() => { isSavingRef.current = false; }, 2000);
    }
  };

  return (
    <div className="pt-16 max-w-2xl mx-auto px-6">
      <h1 className="text-5xl font-black tracking-tighter mb-10 text-white">
        Edit <span className="gold-text">Profile</span>
      </h1>
      
      <div className="aurum-card p-10 rounded-[2.5rem] space-y-6">
        {error && (
          <div className="text-red-500 text-xs bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-pulse">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-500 text-xs bg-green-500/10 p-4 rounded-xl border border-green-500/20">
            {success}
          </div>
        )}

        {[
          { label: 'Username', key: 'username' },
          { label: 'First Name', key: 'firstName' },
          { label: 'Last Name', key: 'lastName' }
        ].map((field) => (
          <div key={field.key} className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {field.label}
            </label>
            <input 
              className={`bg-black border p-4 rounded-xl text-white outline-none transition-all ${
                error && field.key === 'username' ? 'border-red-500' : 'border-zinc-800 focus:border-[#D3AC2C]'
              }`}
              value={formData[field.key] || ''}
              onChange={(e) => {
                setFormData({...formData, [field.key]: e.target.value});
                setError(''); // Clear error when user starts typing
              }}
              disabled={isChecking}
            />
          </div>
        ))}
        
        <button 
          onClick={handleUpdate} 
          disabled={isChecking}
          className="relative overflow-hidden isolate w-full bg-gradient-to-br from-[#FDE68A] via-[#D3AC2C] to-[#A57A03] 
                    text-black text-[11px] font-black uppercase tracking-widest py-4 rounded-xl transition-all 
                    hover:brightness-110 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-yellow-600/20 
                    border border-[#FDE68A]/30 flex items-center justify-center gap-3
                    before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-transparent 
                    before:via-white/40 before:to-transparent before:translate-x-[-100%] 
                    hover:before:translate-x-[100%] before:transition-transform before:duration-700"
        >
          {isChecking && (
            <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>
            {isChecking ? "Saving..." : "Save Changes"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Profile;