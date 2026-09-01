/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import AuthPage from '@/components/auth-page';

export const metadata: Metadata = {
  title: 'Sign In | StreamFind',
  description: 'Sign in to StreamFind to save your watchlist and rate movies.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function AuthRoute() {
  return <AuthPage />;
}
