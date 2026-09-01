import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

export interface AffiliateLinkConfig {
  url: string;
  isFeatured?: boolean;
  offerText?: string;
}

export interface AffiliateLinks {
  [platformKey: string]: string | AffiliateLinkConfig; // string for backwards compatibility
}

// Under current Firestore security rules, this path is globally readable (admin-writable).
const AFFILIATE_DOC_PATH = ['users', 'global_config', 'ratings', 'affiliates'];
const db = getFirestore(app);

let cachedLinks: AffiliateLinks | null = null;
let fetchPromise: Promise<AffiliateLinks> | null = null;

/**
 * Fetches all global affiliate links from Firestore, caching results in-memory.
 */
export async function getAffiliateLinks(): Promise<AffiliateLinks> {
  if (cachedLinks) return cachedLinks;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const docRef = doc(db, AFFILIATE_DOC_PATH[0], AFFILIATE_DOC_PATH[1], AFFILIATE_DOC_PATH[2], AFFILIATE_DOC_PATH[3]);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        cachedLinks = docSnap.data() as AffiliateLinks;
        return cachedLinks;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, AFFILIATE_DOC_PATH.join('/'));
    }
    return {};
  })();

  const result = await fetchPromise;
  fetchPromise = null;
  return result;
}

/**
 * Saves/updates global affiliate links in Firestore and updates the cache.
 */
export async function saveAffiliateLinks(links: AffiliateLinks): Promise<void> {
  const docRef = doc(db, AFFILIATE_DOC_PATH[0], AFFILIATE_DOC_PATH[1], AFFILIATE_DOC_PATH[2], AFFILIATE_DOC_PATH[3]);
  try {
    await setDoc(docRef, links);
    cachedLinks = links;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, AFFILIATE_DOC_PATH.join('/'));
    throw error; // re-throw so callers can show toast errors
  }
}

/**
 * Resolves a platform's watch URL to its affiliate link if configured, otherwise falls back to standard URL.
 */
export function resolveWatchUrl(platformName: string, fallbackUrl: string, affiliateLinks: AffiliateLinks): string {
  if (!platformName) return fallbackUrl;
  const nameLower = platformName.toLowerCase();

  for (const key of Object.keys(affiliateLinks)) {
    if (key && nameLower.includes(key.toLowerCase())) {
      const linkData = affiliateLinks[key];
      const affiliateUrl = typeof linkData === 'string' ? linkData : linkData?.url;
      if (affiliateUrl && affiliateUrl.trim() !== '') {
        return affiliateUrl.trim();
      }
    }
  }
  return fallbackUrl;
}
