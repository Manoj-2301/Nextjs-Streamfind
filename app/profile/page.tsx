import { Metadata } from 'next';
import ProfileComponent from '@/components/profile';

export const metadata: Metadata = {
  title: 'My Profile | StreamFind',
  description: 'View your watch statistics, favorite genres, top movies list, and written critiques.',
};

export default function ProfilePage() {
  return <ProfileComponent />;
}
