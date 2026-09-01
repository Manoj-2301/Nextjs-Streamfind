import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

export interface SystemConfig {
  maintenanceMode: boolean;
  flags: {
    share?: boolean;
    analytics?: boolean;
    realTime?: boolean;
    [key: string]: boolean | undefined;
  };
  achievements: Array<{
    id: string;
    label: string;
    val: string;
    icon: string;
  }>;
  customIcons?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

const DEFAULT_CONFIG: SystemConfig = {
  maintenanceMode: false,
  flags: { share: true, analytics: true, realTime: false },
  achievements: [],
  customIcons: [],
};

const getDocRef = () => doc(getFirestore(app), 'system', 'config');

/**
 * Subscribe to the global system/config Firestore document.
 * Returns an unsubscribe function — call it to clean up the listener.
 */
export function subscribeToSystemConfig(
  onUpdate: (config: SystemConfig) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = getDocRef();

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          maintenanceMode: !!data.maintenanceMode,
          flags: data.flags || {},
          achievements: Array.isArray(data.achievements) ? data.achievements : [],
          customIcons: Array.isArray(data.customIcons) ? data.customIcons : [],
        });
      } else {
        // Initialize defaults if document doesn't exist yet
        setDoc(getDocRef(), DEFAULT_CONFIG).catch(console.error);
        onUpdate(DEFAULT_CONFIG);
      }
    },
    (error) => {
      console.error('[systemService] Failed to fetch system config:', error);
      onError?.(error);
    }
  );
}

/*
 * ============================================================
 * SYSTEM MUTATIONS (WRITES)
 * ============================================================
 */

/** Toggle maintenance mode on/off. */
export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await updateDoc(getDocRef(), { maintenanceMode: enabled });
}

/** Toggle a single feature flag by key. */
export async function setFeatureFlag(
  flags: SystemConfig['flags'],
  flagId: string,
  value: boolean
): Promise<void> {
  await updateDoc(getDocRef(), { flags: { ...flags, [flagId]: value } });
}

/** Save (create or update) an achievement rule set. */
export async function saveAchievement(
  current: SystemConfig['achievements'],
  ach: { id?: string; label: string; val: string; icon: string }
): Promise<void> {
  let updated = [...current];
  if (ach.id) {
    updated = updated.map((a) => (a.id === ach.id ? (ach as any) : a));
  } else {
    updated.push({ ...ach, id: Date.now().toString() } as any);
  }
  await updateDoc(getDocRef(), { achievements: updated });
}

/** Delete an achievement rule set by id. */
export async function deleteAchievement(
  current: SystemConfig['achievements'],
  id: string
): Promise<void> {
  const updated = current.filter((a) => a.id !== id);
  await updateDoc(getDocRef(), { achievements: updated });
}

/** Add a custom icon. */
export async function addCustomIcon(
  current: NonNullable<SystemConfig['customIcons']>,
  icon: { id: string; name: string; url: string }
): Promise<void> {
  await updateDoc(getDocRef(), { customIcons: [...current, icon] });
}

/** Rename a custom icon. */
export async function renameCustomIcon(
  current: NonNullable<SystemConfig['customIcons']>,
  id: string,
  newName: string
): Promise<void> {
  const updated = current.map((i) => (i.id === id ? { ...i, name: newName } : i));
  await updateDoc(getDocRef(), { customIcons: updated });
}

/** Delete a custom icon. */
export async function deleteCustomIcon(
  current: NonNullable<SystemConfig['customIcons']>,
  id: string
): Promise<void> {
  const updated = current.filter((i) => i.id !== id);
  await updateDoc(getDocRef(), { customIcons: updated });
}
