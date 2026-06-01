import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebase';

export interface AuditEvent {
  id?: string;
  event: string;
  detail: string;
  dot: string;
  timestamp?: any;
}

/**
 * Logs a security or account event to the user's audit_logs subcollection.
 * @param uid The user's Firebase UID
 * @param event The short name of the event (e.g., 'Login Successful')
 * @param detail Additional details (e.g., 'Chrome • Mumbai, India')
 * @param dot A Tailwind background color class for the event dot (e.g., 'bg-green-400')
 */
export async function logSecurityEvent(uid: string, event: string, detail: string, dot: string = 'bg-brand') {
  if (!uid) return;

  try {
    const db = getFirestore(app);
    const auditRef = collection(db, `users/${uid}/audit_logs`);
    
    await addDoc(auditRef, {
      event,
      detail,
      dot,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}
