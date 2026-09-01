/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import Browse from '@/components/browse';
import { browseDiscoverMovies } from '@/services/tmdbService';

/*
 * ============================================================
 * METADATA
 * ============================================================
 */
export const metadata: Metadata = {
  title: 'Browse Movies | StreamFind',
  description: 'Browse our complete library of movies. Filter by genre, rating, year and more.',
};

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default async function BrowsePage() {
  // Pre-fetch the default initial page on the server
  // Default values: page=1, sortBy='popularity.desc', language='All', contentType='both'
  const initialData = await browseDiscoverMovies(1, undefined, undefined, undefined, undefined, 'popularity.desc', 'All', undefined, undefined, 'both');

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return <Browse initialData={initialData} />;
}
