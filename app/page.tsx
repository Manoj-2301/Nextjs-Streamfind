/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Suspense } from 'react';
import HomeServerWrapper, { HomeFallback } from './HomeServerWrapper';

export const revalidate = 3600; // ISR: cache the page for 1 hour, revalidate in background


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function HomePage() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeServerWrapper />
    </Suspense>
  );
}
