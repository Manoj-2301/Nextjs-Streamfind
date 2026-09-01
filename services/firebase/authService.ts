/*
 * ============================================================
 * AUTHENTICATION SERVICE
 * ============================================================
 *
 * Responsibility:
 * Handles user session tracking, login streaks, and activity logging
 * within Firestore.
 *
 * Used by:
 * - hooks/firebase/useAuth.ts
 *
 * Important:
 * Do not place UI or React lifecycle logic in this file. This
 * should strictly contain pure database operations for authentication
 * state management.
 * ============================================================
 */

/*
 * ============================================================
 * IMPORTS & INITIALIZATION
 * ============================================================
 */
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

/*
 * ============================================================
 * SESSION MANAGEMENT
 * ============================================================
 */

/**
 * Registers or updates a user session.
 */
export async function registerSession(uid: string, sessionId: string, deviceInfo: any, isNewSession: boolean, locationStr: string): Promise<void> {
  const sessionRef = doc(db, `users/${uid}/sessions/${sessionId}`);
  await setDoc(sessionRef, {
    sessionId,
    deviceInfo,
    lastActive: serverTimestamp(),
    ...(isNewSession ? { createdAt: serverTimestamp(), location: locationStr } : {})
  }, { merge: true });
}

/**
 * Subscribe to the current session document.
 * 
 * Why realtime:
 * This ensures that if an admin or the user themselves (from another device) 
 * deletes this session from Firestore, the client is immediately notified
 * and signed out.
 * 
 * Cleanup:
 * Always call the returned unsubscribe function on unmount.
 */
export function subscribeToSession(uid: string, sessionId: string, onInvalidate: () => void): () => void {
  const sessionRef = doc(db, `users/${uid}/sessions/${sessionId}`);
  return onSnapshot(sessionRef, (snapshot) => {
    // If the document is deleted remotely, forcefully sign out the client.
    // Ensure this only happens when not serving from local cache to avoid offline sign-outs.
    if (!snapshot.exists() && snapshot.metadata.fromCache === false) {
      onInvalidate();
    }
  });
}

/*
 * ============================================================
 * USER ACTIVITY
 * ============================================================
 */

/**
 * Updates the user's last active timestamp and calculates their login streak.
 * 
 * This is called once per session initialization.
 * The logic compares dates using local time zeroed to midnight to ensure 
 * accurate consecutive day calculations regardless of the exact hour of login.
 */
export async function updateUserActivity(uid: string): Promise<void> {
  const userRef = doc(db, `users/${uid}`);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    let newStreak = userData.loginStreak || 1;
    
    if (userData.lastActive) {
      const lastActiveDate = userData.lastActive.toDate();
      const now = new Date();
      const lastActiveDay = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = today.getTime() - lastActiveDay.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1; // Consecutive day
      } else if (diffDays > 1) {
        newStreak = 1; // Streak broken
      }
      // If diffDays === 0, keep current streak
    }
    
    await setDoc(userRef, { 
      lastActive: serverTimestamp(),
      loginStreak: newStreak
    }, { merge: true });
  } else {
    await setDoc(userRef, {
      lastActive: serverTimestamp(),
      loginStreak: 1
    }, { merge: true });
  }
}

/**
 * Deletes a session explicitly (e.g. during logout).
 */
export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/sessions/${sessionId}`));
}
