import React, { useState } from 'react';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'; 
import { auth, db } from '../firebase'; 

const Profile = ({ profileData, setProfileData }) => {
  const [formData, setFormData] = useState(profileData);
  const [isChecking, setIsChecking] = useState(false);
  // Tambahkan state untuk pesan feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdate = async () => {
    setError('');
    setSuccess('');

    // Validasi Dasar: Username tidak boleh mengandung @
    if (!formData.username || formData.username.includes('@')) {
      setError("Invalid username. Do not use '@' symbol.");
      return;
    }

    try {
      setIsChecking(true);
      const usernameChanged = formData.username.trim() !== profileData.username;

      if (usernameChanged) {
        // Cek ketersediaan username di Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", formData.username.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setError(`Username "${formData.username}" is already taken.`);
          setIsChecking(false);
          return;
        }
      }

      // Update data di Firestore
      const docRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(docRef, { 
        ...formData,
        lastUpdated: new Date().toISOString() 
      }, { merge: true });
      
      setProfileData(formData);
      setSuccess("Profile updated successfully!"); // Gunakan success message
    } catch (err) { 
      setError("Error updating profile: " + err.message); 
    } finally {
      setIsChecking(false);
    }
  };

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