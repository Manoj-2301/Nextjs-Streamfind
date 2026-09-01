import { getFirestore, doc, setDoc, getDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

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
 * Subscribes to session changes (for remote invalidation).
 */
export function subscribeToSession(uid: string, sessionId: string, onInvalidate: () => void): () => void {
  const sessionRef = doc(db, `users/${uid}/sessions/${sessionId}`);
  return onSnapshot(sessionRef, (snapshot) => {
    // If the document is deleted remotely, we forcefully sign out the client
    if (!snapshot.exists() && snapshot.metadata.fromCache === false) {
      onInvalidate();
    }
  });
}

/**
 * Updates the user's lastActive timestamp and calculates login streaks.
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
