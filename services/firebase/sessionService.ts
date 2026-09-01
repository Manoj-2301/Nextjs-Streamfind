import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

/**
 * Revoke (delete) a specific session for a user.
 */
export async function revokeSession(uid: string, sessionId: string): Promise<void> {
  const db = getFirestore(app);
  await deleteDoc(doc(db, `users/${uid}/sessions/${sessionId}`));
}
