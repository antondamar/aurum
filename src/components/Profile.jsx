import React, { useState } from 'react';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { auth, db } from '../firebase'; 

const Profile = ({ profileData, setProfileData }) => {
  const [formData, setFormData] = useState(profileData);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Simpan username lama untuk referensi
  const [oldUsername, setOldUsername] = useState(profileData.username);

  const handleUpdate = async () => {
    setError('');
    setSuccess('');

    if (!formData.username || formData.username.includes('@')) {
      setError("Invalid username. Do not use '@' symbol.");
      return;
    }

    // Validasi tambahan untuk username
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setIsChecking(true);
      const usernameChanged = formData.username.trim() !== oldUsername;

      if (usernameChanged) {
        // Cek ketersediaan username di Firestore
        const newUsername = formData.username.trim().toLowerCase();
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", formData.username.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setError(`Username "${formData.username}" is already taken.`);
          setIsChecking(false);
          return;
        }

        // JIKA USERNAME BERUBAH, UPDATE SEMUA DATA YANG TERKAIT
        // 1. Update di koleksi "users"
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userDocRef, { 
          ...formData,
          username: newUsername,
          lastUpdated: new Date().toISOString(),
          previousUsernames: [...(formData.previousUsernames || []), oldUsername] // Simpan history
        }, { merge: true });
        
        // 2. Update di koleksi lain jika perlu (misalnya: posts, comments, dll)
        // Contoh: await updateReferencesInOtherCollections(oldUsername, formData.username);
        
        setOldUsername(formData.username); // Update old username
      } else {
        // Jika username tidak berubah, hanya update data biasa
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userDocRef, { 
          ...formData,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      
      setProfileData(formData);
      setSuccess("Profile updated successfully!");
      
      // Reset success message setelah 3 detik
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) { 
      setError("Error updating profile: " + err.message); 
    } finally {
      setIsChecking(false);
    }
  };

  // Update formData ketika profileData berubah
  React.useEffect(() => {
    setFormData(profileData);
    setOldUsername(profileData.username);
  }, [profileData]);


  return (
    <div className="pt-16 max-w-2xl mx-auto px-6">
      <h1 className="text-5xl font-black tracking-tighter mb-10 text-white">Edit <span className="gold-text">Profile</span></h1>
      
      <div className="aurum-card p-10 rounded-[2.5rem] space-y-6">
        {/* Tampilan Pesan Error (Mirip halaman Auth) */}
        {error && (
          <div className="text-red-500 text-xs bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-pulse">
            {error}
          </div>
        )}

        {/* Tampilan Pesan Success */}
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
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</label>
            <input 
              className={`bg-black border p-4 rounded-xl text-white outline-none transition-all ${
                error && field.key === 'username' ? 'border-red-500' : 'border-zinc-800 focus:border-[#D3AC2C]'
              }`}
              value={formData[field.key]}
              onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
              disabled={isChecking}
            />
          </div>
        ))}
        
        <button 
          onClick={handleUpdate} 
          disabled={isChecking}
          className="w-full bg-[#D3AC2C] text-black font-bold py-4 rounded-xl hover:bg-[#A57A03] transition-all disabled:opacity-50"
        >
          {isChecking ? "Verifying..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default Profile;