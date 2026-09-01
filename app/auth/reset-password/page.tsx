/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordPage from '@/components/reset-password';

export const metadata: Metadata = {
  title: 'Reset Password | StreamFind',
  description: 'Set a new password for your StreamFind account.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function ResetPasswordRoute() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
