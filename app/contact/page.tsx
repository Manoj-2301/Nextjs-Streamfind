import { Metadata } from 'next';
import Contact from '@/components/contact';

export const metadata: Metadata = {
  title: 'Contact Us | StreamFind',
  description: 'Get in touch with the StreamFind team.',
};

export default function ContactPage() {
  return <Contact />;
}
