import { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data & API Disclaimer | StreamFind',
  description: 'Information regarding our data sources and API usage from TMDB.',
};

export default function DataDisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl text-white">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Data & API Disclaimer</h1>
      <div className="prose prose-invert max-w-none space-y-8 text-white/70">
        
        <section className="p-6 rounded-2xl bg-brand/10 border border-brand/20">
          <h2 className="text-2xl font-bold text-white mt-0 mb-4 flex items-center gap-2">
            Data Source Attribution
          </h2>
          <p>
            StreamFind is an aggregator platform. <strong>We do not host, store, or own any of the movie, TV show, or actor data displayed on our website.</strong> All metadata, including but not limited to titles, synopses, release dates, ratings, cast & crew information, movie posters, and backdrop images are provided by the <strong>TMDb (The Movie Database) API</strong>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <a 
              href="https://www.themoviedb.org/" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold text-white transition-colors w-fit"
            >
              Visit TMDB Website <ExternalLink className="w-4 h-4" />
            </a>
            <a 
              href="https://developer.themoviedb.org/docs" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors w-fit"
            >
              TMDB API Documentation <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Editing Movie or Show Information</h2>
          <p>
            Because all of our data is pulled dynamically from TMDb, <strong>we cannot manually edit, update, or delete information regarding movies, TV shows, or people on StreamFind.</strong> 
          </p>
          <p>
            If you notice incorrect information, a missing title, or a wrong poster, please head directly to TMDb and create an account to edit the data there. Since StreamFind relies on their API, any changes you make on the TMDb platform will automatically reflect on StreamFind within 24 to 48 hours.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Copyright & Fair Use</h2>
          <p>
            StreamFind uses the TMDb API but is not endorsed or certified by TMDb. The use of movie posters, images, and promotional material on this site falls under the principles of "Fair Use" as they are used for informational and commentary purposes regarding the specific works they depict.
          </p>
          <p>
            If you believe your copyrighted work is being infringed upon, please refer to our <Link href="/dmca" className="text-brand hover:underline">DMCA Policy</Link> for instructions on how to submit a takedown notice. However, please be aware that since we fetch data via TMDb, you may also need to submit a takedown request to TMDb directly to have the content completely removed from the source.
          </p>
        </section>

        <p className="pt-8 text-sm text-white/40">Last updated: June 2026</p>
      </div>
    </div>
  );
}
