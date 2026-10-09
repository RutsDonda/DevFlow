import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REDACTED_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-devflow-b64d4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-devflow-b64d4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-devflow-b64d4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "214371090686",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:214371090686:web:0eb2fccfd32bf1ada8e5af",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RX7NYDHTHN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Provider to always prompt for account selection
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics only if supported
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, auth, googleProvider, signInWithPopup, analytics };
export default app;
