'use client';
import { getFirestore, doc, setDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { parseUserAgent } from '@/lib/deviceParser';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithPopup, signInWithRedirect, googleProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, app } from '@/lib/firebase';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);
  
  // Keep track of listener to unsubscribe if needed
  const sessionListenerRef = useRef<() => void>(null);

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
        const sessionRef = doc(db, `users/${currentUser.uid}/sessions/${sessionId}`);

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
          await setDoc(sessionRef, {
            sessionId,
            deviceInfo,
            lastActive: serverTimestamp(),
            ...(isNewSession ? { createdAt: serverTimestamp(), location: locationStr } : {})
          }, { merge: true });

          // Start listening for remote invalidation
          if (sessionListenerRef.current) {
            sessionListenerRef.current(); // Unsubscribe old listener
          }
          
          sessionListenerRef.current = onSnapshot(sessionRef, (snapshot) => {
            // If the document is deleted remotely, we forcefully sign out the client
            if (!snapshot.exists() && snapshot.metadata.fromCache === false) {
              console.warn("Session invalidated remotely. Logging out.");
              // Don't call our custom logout() because that tries to delete the doc again
              localStorage.removeItem(SESSION_KEY);
              signOut(auth);
            }
          });
        } catch (error) {
          console.error("Failed to register session:", error);
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
  }, [db]);

  const loginWithGoogle = async () => {
  try {
    // Use popup on ALL devices — works on mobile too
    const result = await signInWithPopup(auth, googleProvider);

    if (result?.user) {
      await setDoc(
        doc(db, 'users', result.user.uid),
        { lastActive: serverTimestamp() },
        { merge: true }
      );
    }
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') throw error;
    console.error("Login failed:", error);
    throw error;
  }
};

  const loginWithEmail = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error("Please verify your email before logging in. Check your inbox.");
    }
    // Write lastActive on login
    await setDoc(doc(db, 'users', userCredential.user.uid), { lastActive: serverTimestamp() }, { merge: true });
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
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
  };

  const sendPasswordReset = async (email: string) => {
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
  };

  const logout = async () => {
    try {
      if (user) {
        const sessionId = localStorage.getItem(SESSION_KEY);
        if (sessionId) {
          // Delete our session from Firestore cleanly
          await deleteDoc(doc(db, `users/${user.uid}/sessions/${sessionId}`));
        }
      }
      localStorage.removeItem(SESSION_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout, sendPasswordReset }}>
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
