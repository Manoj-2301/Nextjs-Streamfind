import { Metadata } from 'next';
import Browse from '@/components/browse';

export const metadata: Metadata = {
  title: 'Browse Movies | StreamFind',
  description: 'Browse our complete library of movies. Filter by genre, rating, year and more.',
};

export default function BrowsePage() {
  return <Browse />;
}
