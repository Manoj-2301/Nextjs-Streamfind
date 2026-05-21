import { getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AffiliateLinkConfig {
  url: string;
  isFeatured?: boolean;
  offerText?: string;
}

export interface AffiliateLinks {
  [platformKey: string]: string | AffiliateLinkConfig; // string for backwards compatibility
}

// Under user's current security rules, document path '/users/global_config/ratings/affiliates'
// is globally readable (matches /{path=**}/ratings/{movieId}) and admin-writable.
const AFFILIATE_DOC_PATH = ['users', 'global_config', 'ratings', 'affiliates'];

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
      const docRef = doc(getFirestore(app), AFFILIATE_DOC_PATH[0], AFFILIATE_DOC_PATH[1], AFFILIATE_DOC_PATH[2], AFFILIATE_DOC_PATH[3]);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        cachedLinks = docSnap.data() as AffiliateLinks;
        return cachedLinks;
      }
    } catch (error) {
      console.error('Failed to fetch affiliate links from Firestore:', error);
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
  const docRef = doc(getFirestore(app), AFFILIATE_DOC_PATH[0], AFFILIATE_DOC_PATH[1], AFFILIATE_DOC_PATH[2], AFFILIATE_DOC_PATH[3]);
  await setDoc(docRef, links);
  cachedLinks = links;
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
