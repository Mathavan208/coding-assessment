import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
 apiKey: "AIzaSyA39002uqowAS55OqNkg5sUAy0rQ2v_d8g",
  authDomain: "coding-website-44c1f.firebaseapp.com",
  projectId: "coding-website-44c1f",
  storageBucket: "coding-website-44c1f.firebasestorage.app",
  messagingSenderId: "643635482494",
  appId: "1:643635482494:web:95148d77173c0c65762d2f",
  measurementId: "G-4BM65RD7T6"
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
