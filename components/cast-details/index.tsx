'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronLeft, Loader2, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCastDetails, getCastMovies } from '@/services/tmdbService';
import { Movie, CastMember } from '@/types';
import ErrorMessage from '@/components/ui/error-message';
import MovieCard from '@/components/ui/movie-card';

export default function CastDetails() {
  const params = useParams<{ id: string }>();  const id = params.id;
  const router = useRouter();
  const [cast, setCast] = useState<CastMember | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(false);
      try {
        // The id parameter contains both the ID and the name (e.g. '83271-chris-evans')
        // parseInt will safely extract just the '83271' from the start of the string!
        const personId = parseInt(id);
        
        if (isNaN(personId)) {
          throw new Error('Invalid URL format. Please return to the movie page and click the cast member again.');
        }

        const [details, castMovies] = await Promise.all([
          getCastDetails(personId),
          getCastMovies(personId)
        ]);
        setCast(details);
        setMovies(castMovies);
      } catch (err) {
        console.error('Error fetching cast details:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <p className="text-white/40 font-black tracking-[0.4em] uppercase text-xs">Loading Talent...</p>
      </div>
    );
  }

  if (error || !cast) {
    return <div className="pt-20"><ErrorMessage message="The cast member you are looking for doesn't exist or could not be loaded." /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-20"
    >
      

      <div className="container mx-auto px-4 md:px-12 max-w-7xl pt-12 md:pt-20">
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full glass flex items-center justify-center hover:bg-brand hover:text-black transition-all group cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-white/40">
            CAST PROFILE
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-10 md:gap-16">
          {/* Profile Image */}
          <div className="w-48 md:w-80 shrink-0 mx-auto md:mx-0">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img
                src={cast.imageUrl}
                alt={cast.name}
                className="w-full h-auto aspect-[2/3] object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Info details */}
            <div className="mt-8 flex flex-col gap-4 text-white/60">
               {cast.birthday && (
                 <div className="flex items-center gap-3">
                   <Calendar className="w-4 h-4 text-brand" />
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Birthday</span>
                     <span className="text-sm font-bold text-white">{new Date(cast.birthday).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                   </div>
                 </div>
               )}
               {cast.placeOfBirth && (
                 <div className="flex items-center gap-3">
                   <MapPin className="w-4 h-4 text-brand" />
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Place of Birth</span>
                     <span className="text-sm font-bold text-white">{cast.placeOfBirth}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-4xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none">
                {cast.name}
              </h1>

              {cast.biography ? (
                <div className="mb-12">
                   <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand"></span> BIOGRAPHY
                  </h3>
                  <p className="text-base md:text-lg text-white/70 leading-relaxed font-light">
                    {cast.biography}
                  </p>
                </div>
              ) : (
                <p className="text-white/40 italic mb-12 uppercase text-xs tracking-widest">No biography available for this artist.</p>
              )}

              {/* Movies Done */}
              <div>
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> KNOWN FOR
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
