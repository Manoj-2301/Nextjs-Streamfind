/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import AboutUs from '@/components/about-us';

export const metadata: Metadata = {
  title: 'About Us | StreamFind',
  description: 'Learn about StreamFind - the ultimate movie streaming aggregator.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function AboutPage() {
  return <AboutUs />;
}
