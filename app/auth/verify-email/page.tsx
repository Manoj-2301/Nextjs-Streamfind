import { Metadata } from 'next';
import { Suspense } from 'react';
import VerifyEmailPage from '@/components/verify-email';

export const metadata: Metadata = {
  title: 'Verify Email | StreamFind',
  description: 'Verify your StreamFind email address.',
};

export default function VerifyEmailRoute() {
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  );
}
