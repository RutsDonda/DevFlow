import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

/** Thrown by login flows when the person has never created an account. */
export const NO_ACCOUNT = 'app/no-account';

const FIREBASE_ERRORS = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists. Please log in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error – check your connection.',
  'auth/operation-not-allowed': 'Signing up with email isn’t available right now. Please use "Sign in with Google" instead.',
  'auth/unauthorized-domain': 'This domain is not authorised in Firebase → Authentication → Settings.',
  'auth/popup-blocked': 'The sign-in popup was blocked by the browser.',
};

/** Human-readable message for a Firebase or API error. Returns null for user-cancelled popups. */
export const authErrorMessage = (error) => {
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error?.code)) return null;
  return FIREBASE_ERRORS[error?.code] || error?.message || 'Authentication failed';
};

const noAccountError = (email) => Object.assign(
  new Error('No account found. Please create an account first.'),
  { code: NO_ACCOUNT, email },
);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // While a login/register flow runs it owns the profile; the listener must not interfere
  const flowRef = useRef(false);

  // Restore a session on page load: a Firebase sign-in only counts if an account exists.
  useEffect(() => onAuthStateChanged(auth, async (fbUser) => {
    setFirebaseUser(fbUser);
    if (flowRef.current) return;
    if (!fbUser) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    try {
      setProfile(await authAPI.me());
    } catch (error) {
      setProfile(null);
      if (error.status === 404) await signOut(auth); // signed in to Firebase but never registered
    } finally {
      setIsLoading(false);
    }
  }), []);

  const runFlow = async (fn) => {
    flowRef.current = true;
    try {
      const p = await fn();
      setProfile(p);
      return p;
    } finally {
      flowRef.current = false;
      setIsLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    try { setProfile(await authAPI.me()); } catch { /* keep the current profile */ }
  }, []);

  /** Email login: first make sure an account exists, then sign in. */
  const login = (email, password) => runFlow(async () => {
    const { exists } = await authAPI.checkEmail(email);
    if (!exists) throw noAccountError(email);
    await signInWithEmailAndPassword(auth, email, password);
    try {
      return await authAPI.login();
    } catch (error) {
      await signOut(auth);
      throw error.status === 404 ? noAccountError(email) : error;
    }
  });

  /** Google login: signs in, creating the account on first use (the Google profile is the sign-up). */
  const loginWithGoogle = () => runFlow(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    try {
      return await authAPI.login();
    } catch (error) {
      if (error.status !== 404) {
        await signOut(auth);
        throw error;
      }
    }
    try {
      return await authAPI.register(result.user.displayName);
    } catch (error) {
      // Don't leave a Firebase user behind that has no account in the app
      if (getAdditionalUserInfo(result)?.isNewUser) await result.user.delete().catch(() => signOut(auth));
      else await signOut(auth);
      throw error;
    }
  });

  const register = (name, email, password) => runFlow(async () => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(cred.user, { displayName: name });
      return await authAPI.register(name);
    } catch (error) {
      await cred.user.delete().catch(() => signOut(auth)); // keep Firebase and MongoDB in sync
      throw error;
    }
  });

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const logout = () => signOut(auth);

  const user = profile && {
    ...profile,
    name: profile.display_name || firebaseUser?.displayName || profile.email?.split('@')[0] || 'there',
    photo: profile.photo_url || firebaseUser?.photoURL || null,
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(firebaseUser && profile),
        isLoading,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
