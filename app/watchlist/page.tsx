/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { Metadata } from 'next';
import Watchlist from '@/components/watchlist';

export const metadata: Metadata = {
  title: 'My Watchlist | StreamFind',
  description: 'Your personal watchlist of movies to watch later.',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function WatchlistPage() {
  return <Watchlist />;
}
