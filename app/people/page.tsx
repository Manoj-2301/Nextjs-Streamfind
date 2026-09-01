import PeopleView from '@/components/people';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Popular Actors | StreamFind',
  description: 'Discover the most trending actors, directors, and crew members in the entertainment industry right now.',
};

export default function PeoplePage() {
  return <PeopleView />;
}
