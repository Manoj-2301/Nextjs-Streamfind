/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';
import { v4 as uuidv4 } from 'uuid';
import { parseUserAgent } from '@/lib/deviceParser';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithPopup, signInWithRedirect, googleProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from '@/lib/firebase';
import { registerSession, subscribeToSession, updateUserActivity, deleteSession } from '@/services/firebase/authService';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  signupWithEmail: (e: string, p: string, n: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'moviefind_session_id';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Keep track of listener to unsubscribe if needed
  const sessionListenerRef = useRef<() => void>(null);


  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Register or refresh session
        let sessionId = localStorage.getItem(SESSION_KEY);
        let isNewSession = false;
        if (!sessionId) {
          sessionId = uuidv4();
          localStorage.setItem(SESSION_KEY, sessionId);
          isNewSession = true;
        }

        const deviceInfo = parseUserAgent(navigator.userAgent);

        // Fetch approximate location via IP (free, no key required)
        let locationStr = 'Location unavailable';
        if (isNewSession) {
          try {
            const geo = await fetch('https://ipapi.co/json/');
            if (geo.ok) {
              const geoData = await geo.json();
              const city = geoData.city || '';
              const region = geoData.region || '';
              const country = geoData.country_name || '';
              locationStr = [city, region, country].filter(Boolean).join(', ') || 'Unknown';
            }
          } catch {
            locationStr = 'Location unavailable';
          }
        }

        try {
          // Update session document
          await registerSession(currentUser.uid, sessionId, deviceInfo, isNewSession, locationStr);

          // Start listening for remote invalidation
          if (sessionListenerRef.current) {
            sessionListenerRef.current(); // Unsubscribe old listener
          }
          
          sessionListenerRef.current = subscribeToSession(currentUser.uid, sessionId, () => {
            console.warn("Session invalidated remotely. Logging out.");
            // Don't call our custom logout() because that tries to delete the doc again
            localStorage.removeItem(SESSION_KEY);
            signOut(auth);
          });

          // Update user's lastActive and loginStreak
          await updateUserActivity(currentUser.uid);
          
        } catch (error) {
          console.error("Failed to register session/streak:", error);
        }
      } else {
        // Logged out
        if (sessionListenerRef.current) {
          sessionListenerRef.current();
          sessionListenerRef.current = null;
        }
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
      }
    };
  }, []);

  const loginWithGoogle = React.useCallback(async () => {
    try {
      // Use popup on ALL devices — works on mobile too
      const result = await signInWithPopup(auth, googleProvider);

      // The onAuthStateChanged listener handles updating lastActive and loginStreak
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') throw error;
      
      // Fallback to redirect if popup fails (common in production mobile/in-app browsers or due to 3rd party cookie blocking)
      if (
        error?.code === 'auth/popup-blocked' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/web-storage-unsupported' ||
        error?.message?.includes('cross-origin') ||
        error?.code === 'auth/internal-error'
      ) {
        console.log("Popup failed, falling back to redirect...");
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  const loginWithEmail = React.useCallback(async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error("Please verify your email before logging in. Check your inbox.");
    }
    // The onAuthStateChanged listener handles updating lastActive and loginStreak
  }, []);

  const signupWithEmail = React.useCallback(async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
    // Sign out immediately — email must be verified before login
    await signOut(auth);
    // Send our custom-themed verification email via our API
    const res = await fetch('/api/auth/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'verify', email, displayName: name }),
    });
    if (!res.ok) {
      let data;
      try { data = await res.json(); } catch(e) {}
      throw new Error(data?.error || 'Failed to send verification email.');
    }
  }, []);

  const sendPasswordReset = React.useCallback(async (email: string) => {
    // Send our custom-themed reset email via our API
    const res = await fetch('/api/auth/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reset', email }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to send reset email.');
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      if (user) {
        const sessionId = localStorage.getItem(SESSION_KEY);
        if (sessionId) {
          // Delete our session from Firestore cleanly
          await deleteSession(user.uid, sessionId);
        }
      }
      localStorage.removeItem(SESSION_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [user]);

  const value = React.useMemo(() => ({
    user,
    loading,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
    sendPasswordReset
  }), [user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout, sendPasswordReset]);


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
