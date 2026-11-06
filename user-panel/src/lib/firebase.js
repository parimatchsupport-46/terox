/* Shared Firebase project configuration for both panels. */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDC4LHwTGhLMF0ldHjOHAkglWhvk43Ek9M",
  authDomain: "terox-chat.firebaseapp.com",
  projectId: "terox-chat",
  storageBucket: "terox-chat.firebasestorage.app",
  messagingSenderId: "657285047009",
  appId: "1:657285047009:web:e7b77af926dfab08070da0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp };
