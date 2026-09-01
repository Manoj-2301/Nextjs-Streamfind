/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import { Suspense } from 'react';
import VerifyEmailPage from '@/components/verify-email';

export const metadata: Metadata = {
  title: 'Verify Email | StreamFind',
  description: 'Verify your StreamFind email address.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function VerifyEmailRoute() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  );
}
