import { Metadata } from 'next';
import Sponsorship from '@/components/sponsorship';

export const metadata: Metadata = {
  title: 'Sponsorship | StreamFind',
  description: 'Partner with StreamFind and reach millions of movie enthusiasts.',
};

export default function SponsorshipPage() {
  return <Sponsorship />;
}
