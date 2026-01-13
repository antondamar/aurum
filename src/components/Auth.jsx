import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fungsi untuk mencari user berdasarkan username
  const findUserByUsername = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return {
          email: userDoc.data().email,
          userId: userDoc.id
        };
      }
      return null;
    } catch (error) {
      console.error("Error finding user:", error);
      return null;
    }
  };

  // Fungsi untuk cek apakah email sudah terdaftar
  const checkEmailExists = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      if (isRegistering) {
        // 1. CEK USERNAME SAAT REGISTER
        const existingUsername = await findUserByUsername(username);
        if (existingUsername) {
          const msg = 'Username "' + username + '" is already taken!';
          setError(msg);
          return;
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('Please enter a valid email address');
          return;
        }

        // Validasi username (tidak boleh mengandung @)
        if (username.includes('@')) {
          setError('Username cannot contain @ symbol');
          return;
        }

        // Validasi username (hanya huruf, angka, underscore)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
          setError('Username can only contain letters, numbers, and underscores');
          return;
        }
        
        // Validasi input
        if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
          setError('All fields are required');
          return;
        }
        
        // Validasi Password Match (Update di sini)
        if (password !== confirmPassword) {
          const errorMsg = 'Passwords do not match! Please re-type your password.';
          setError(errorMsg);
          return;
        }

        // Validasi password
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }

        // Validasi password match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Cek apakah email sudah terdaftar
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
          setError('Email already registered');
          return;
        }

        // Cek apakah username sudah digunakan

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Initialize data in Firestore dengan profile data
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          portfolios: [],
          assetMasterList: [],
          email: user.email,
          username: username,
          firstName: firstName,
          lastName: lastName,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        
        setSuccess('Account created successfully! Please login.');
        setIsRegistering(false); // Switch to login mode
        
      } else {
        let loginEmail = email;
        
        if (!email.includes('@')) {
          const foundUser = await findUserByUsername(email);
          if (!foundUser) {
            setError('Username not found');
            return;
          }
          loginEmail = foundUser.email;
        }
        
        await signInWithEmailAndPassword(auth, loginEmail, password);
      }
    } catch (error) {
      // Handle registration errors
      if (error.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else {
        setError(error.message);
      }
    }
  };

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 6) score++;
    if (/[A-Z]/.test(pass)) score++; // Has uppercase
    if (/[0-9]/.test(pass)) score++; // Has number
    if (/[^A-Za-z0-9]/.test(pass)) score++; // Has special char
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      // Cek apakah email ada di database
      const emailExists = await checkEmailExists(email);
      if (!emailExists) {
        setError('Email not found in our system');
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Check your inbox.');
      setIsResetting(false);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('Email not found in our system');
      } else {
        setError(error.message);
      }
    }
  };

  // Reset form saat beralih mode
  const toggleRegisterMode = () => {
    setIsRegistering(!isRegistering);
    setIsResetting(false);
    setError('');
    setSuccess('');
    setFirstName('');
    setLastName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const toggleResetMode = () => {
    setIsResetting(!isResetting);
    setIsRegistering(false);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-white">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-extrabold tracking-tighter">
          <span className="text-[#D3AC2C]">Aurum</span> Tracker
        </h2>
        <p className="text-zinc-500 text-s mt-2 tracking-widest font-bold">
          {isResetting ? 'Reset Password' : 
           isRegistering ? 'Create your account' : 'Au'}
        </p>
      </div>

      {success && (
        <div className="mb-4 w-full max-w-md">
          <p className="text-green-500 text-xs bg-green-500/10 p-3 rounded-lg border border-green-500/20">
            {success}
          </p>
        </div>
      )}

      {isResetting ? (
        // RESET PASSWORD FORM
        <form onSubmit={handlePasswordReset} className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl w-full max-w-md space-y-4 backdrop-blur-xl">
          <p className="text-zinc-400 text-sm mb-4">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          <div>
            <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">Email Address</label>
            <input 
              type="email" 
              placeholder="name@domain.com"
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-[#D3AC2C] mt-1 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="submit"
              className="flex-1 bg-[#D3AC2C] text-black font-bold py-4 rounded-xl hover:bg-[#b89624] transition-all"
            >
              SEND RESET LINK
            </button>
            <button 
              type="button"
              onClick={toggleResetMode}
              className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-all"
            >
              CANCEL
            </button>
          </div>
        </form>
      ) : (
        // LOGIN/REGISTER FORM
        <form onSubmit={handleAuth} className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl w-full max-w-md space-y-4 backdrop-blur-xl">
          {error && <p className="text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}
          
          {/* Register fields - hanya tampil saat register */}
          {isRegistering && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">First Name</label>
                  <input 
                    type="text" 
                    placeholder="Ferrel"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-[#D3AC2C] mt-1 transition-all"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Handoyo"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-[#D3AC2C] mt-1 transition-all"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">Username</label>
                <input 
                  type="text" 
                  placeholder="ferrelhandoyo"
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-[#D3AC2C] mt-1 transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="text-[10px] text-zinc-500 mt-1 ml-1">
                  No @ symbols allowed. Only letters, numbers, and underscores.
                </p>
              </div>
            </>
          )}
          
          {/* Email/Username field */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">
              {isRegistering ? 'Email Address' : 'Email or Username'}
            </label>
            <input 
              type={isRegistering ? "email" : "text"}
              placeholder={isRegistering ? "name@domain.com" : "email or username"}
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-[#D3AC2C] mt-1 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password field with Strength Meter */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-[#D3AC2C] mt-1 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm Password field - hanya untuk register */}
          {isRegistering && (
            <div>
              <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase ml-1">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••••" 
                  className={`w-full bg-black p-4 rounded-xl outline-none mt-1 transition-all border ${
                    confirmPassword && confirmPassword !== password 
                      ? 'border-red-500' // RED BORDER if mismatch
                      : 'border-zinc-800 focus:border-[#D3AC2C]'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1 animate-pulse">Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-[#D3AC2C] text-black font-bold py-4 rounded-xl hover:bg-[#b89624] transition-all shadow-lg shadow-[#D3AC2C]/10">
            {isRegistering ? 'SIGN UP' : 'LOGIN'}
          </button>

          {/* Forgot Password link - hanya untuk login mode */}
          {!isRegistering && !isResetting && (
            <div className="text-center">
              <button 
                type="button"
                onClick={toggleResetMode}
                className="text-zinc-500 text-xs hover:text-white transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </form>
      )}

      {/* Toggle button */}
      {!isResetting && (
        <button 
          onClick={toggleRegisterMode} 
          className="mt-6 text-zinc-500 text-xs font-bold hover:text-white transition-colors tracking-widest uppercase mb-6"
        >
          {isRegistering ? 'Already have an account? Login here' : 'Create New Account'}
        </button>
      )}
    </div>
  );
};

export default Auth;