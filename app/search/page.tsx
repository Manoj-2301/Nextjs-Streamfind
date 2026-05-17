import { Metadata } from 'next';
import SearchPage from '@/components/search-page';

export const metadata: Metadata = {
  title: 'Search Movies | StreamFind',
  description: 'Search for any movie, actor, or genre in our vast database.',
};

export default function SearchRoute() {
  return <SearchPage />;
}
