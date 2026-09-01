/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import { Suspense } from 'react';
import AuthActionPage from '@/components/auth-action';

export const metadata: Metadata = {
  title: 'StreamFind | Account Action',
  description: 'Verify your email or reset your StreamFind password.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function AuthActionRoute() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <Suspense>
      <AuthActionPage />
    </Suspense>
  );
}
