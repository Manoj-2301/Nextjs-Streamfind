import { Metadata } from 'next';
import AdminComponent from '@/components/admin';

export const metadata: Metadata = {
  title: "Director's Hub | StreamFind",
  description: "Platform administration and analytics hub for StreamFind.",
};

export default function AdminPage() {
  return <AdminComponent />;
}
