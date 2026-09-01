/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import PrivacyPolicy from '@/components/privacy-policy';

export const metadata: Metadata = {
  title: 'Privacy Policy | StreamFind',
  description: 'Read our privacy policy to understand how we handle your data.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
