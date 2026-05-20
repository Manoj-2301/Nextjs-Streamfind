import { Metadata } from 'next';
import { Suspense } from 'react';
import AuthActionPage from '@/components/auth-action';

export const metadata: Metadata = {
  title: 'StreamFind | Account Action',
  description: 'Verify your email or reset your StreamFind password.',
};

export default function AuthActionRoute() {
  return (
    <Suspense>
      <AuthActionPage />
    </Suspense>
  );
}
