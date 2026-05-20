import { Metadata } from 'next';
import { Suspense } from 'react';
import ProfileComponent from '@/components/profile';

export const metadata: Metadata = {
  title: 'My Profile | StreamFind',
  description: 'View your watch statistics, favorite genres, top movies list, and written critiques.',
};

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-2 border-white/40 border-t-white rounded-full animate-spin mb-4" />
        <span className="text-white/40 text-xs font-black uppercase tracking-widest">Loading Profile...</span>
      </div>
    }>
      <ProfileComponent />
    </Suspense>
  );
}
