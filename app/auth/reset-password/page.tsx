import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordPage from '@/components/reset-password';

export const metadata: Metadata = {
  title: 'Reset Password | StreamFind',
  description: 'Set a new password for your StreamFind account.',
};

export default function ResetPasswordRoute() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
