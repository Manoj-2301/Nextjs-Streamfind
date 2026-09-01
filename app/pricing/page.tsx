/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import Pricing from '@/components/pricing';

export const metadata: Metadata = {
  title: 'Pricing | StreamFind',
  description: 'Choose the perfect StreamFind plan. Unlock premium features, ad-free experience, and early access.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function PricingPage() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <main className="min-h-screen bg-black">
      <Pricing />
    </main>
  );
}
