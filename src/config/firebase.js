import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Use PRODUCTION Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// ✅ Only connect Functions emulator for local code execution testing
if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {

  
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.log('⚠️ Functions Emulator connection failed:', error.message);
  }
}


export default app;
