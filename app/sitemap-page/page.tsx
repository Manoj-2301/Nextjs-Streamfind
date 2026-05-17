import { Metadata } from 'next';
import Sitemap from '@/components/sitemap';

export const metadata: Metadata = {
  title: 'Sitemap | StreamFind',
  description: 'Navigate all pages of StreamFind.',
};

export default function SitemapPage() {
  return <Sitemap />;
}
