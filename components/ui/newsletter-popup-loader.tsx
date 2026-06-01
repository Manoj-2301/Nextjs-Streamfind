'use client';
import dynamic from 'next/dynamic';

const NewsletterPopup = dynamic(() => import('@/components/ui/newsletter-popup'), { ssr: false });

export default function NewsletterPopupLoader() {
  return <NewsletterPopup />;
}
