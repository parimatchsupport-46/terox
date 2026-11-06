/* ==========================================================================
   firebase.js — Firebase initialization for Terox.
   Reads config from Vite env vars (VITE_FIREBASE_*).
   Set these in Vercel project settings → Environment Variables:
     VITE_FIREBASE_API_KEY
     VITE_FIREBASE_AUTH_DOMAIN
     VITE_FIREBASE_PROJECT_ID
     VITE_FIREBASE_STORAGE_BUCKET
     VITE_FIREBASE_MESSAGING_SENDER_ID
     VITE_FIREBASE_APP_ID
   ========================================================================== */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp };
