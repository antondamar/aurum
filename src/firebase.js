// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsENBJ8dL4IolYbmq4BQQhlflz2iupue8",
  authDomain: "my-investment-tracker-ae5f1.firebaseapp.com",
  projectId: "my-investment-tracker-ae5f1",
  storageBucket: "my-investment-tracker-ae5f1.firebasestorage.app",
  messagingSenderId: "708582900906",
  appId: "1:708582900906:web:297f67b3f80dab7cbdbcd3",
  measurementId: "G-Y1L242YWTM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Make sure to export these
export { auth, db, analytics };