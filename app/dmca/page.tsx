import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DMCA Policy | StreamFind',
  description: 'Digital Millennium Copyright Act (DMCA) Policy for StreamFind.',
};

export default function DMCAPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl text-white">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">DMCA Policy</h1>
      <div className="prose prose-invert max-w-none space-y-6 text-white/70">
        <p>StreamFind respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998, the text of which may be found on the U.S. Copyright Office website, StreamFind will respond expeditiously to claims of copyright infringement committed using the StreamFind service.</p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Notice of Infringement</h2>
        <p>If you are a copyright owner, authorized to act on behalf of one, or authorized to act under any exclusive right under copyright, please report alleged copyright infringements taking place on or through the Site by completing a DMCA Notice of Alleged Infringement and delivering it to our designated Copyright Agent.</p>
        <h2 className="text-2xl font-bold text-white mt-8 mb-4">Disclaimer</h2>
        <p>StreamFind is an aggregator. We do not host any copyrighted media files. All movie and TV show data, posters, and trailers are provided via APIs from third-party services like TMDB and YouTube.</p>
        <p className="pt-8 text-sm text-white/40">Last updated: June 2026</p>
      </div>
    </div>
  );
}
