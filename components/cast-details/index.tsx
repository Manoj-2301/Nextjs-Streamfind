/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2, Calendar, MapPin, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { useCastDetails, useCastMovies } from '@/hooks/useTmdbQueries';
import { Movie, CastMember } from '@/types';
import ErrorMessage from '@/components/ui/error-message';
import MovieCard from '@/components/ui/movie-card';

import Pagination from '@/components/ui/pagination';

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function CastDetails({
  initialCast,
  initialMovies,
  initialTotalPages = 1,
  initialCurrentPage = 1
}: {
  initialCast?: CastMember;
  initialMovies?: Movie[];
  initialTotalPages?: number;
  initialCurrentPage?: number;
}) {
  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const params = useParams<{ id: string }>();  const id = params.id;
  const router = useRouter();
  
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const personId = parseInt(id || '0');

  const { data: castData, isLoading: isCastLoading, error: castError } = useCastDetails(personId);
  const { data: moviesData, isFetching: isMoviesFetching } = useCastMovies(personId, currentPage);

  const cast = castData || initialCast;
  const error = !!castError;
  const isLoading = !initialCast && isCastLoading;
  
  const isMoviesLoading = isMoviesFetching;
  const movies = moviesData?.items || initialMovies || [];
  const totalPages = moviesData?.totalPages || initialTotalPages;

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftState = useRef(0);

  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    if (scrollRef.current) {
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeftState.current = scrollRef.current.scrollLeft;
    }
  };
  const handleMouseLeave = () => {
    isDragging.current = false;
  };
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; 
    scrollRef.current.scrollLeft = scrollLeftState.current - walk;
  };

  const handlePageChange = (page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
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
              <Image
                src={cast.imageUrl}
                alt={cast.name}
                width={320}
                height={480}
                className="w-full h-auto aspect-[2/3] object-cover"
                priority
                unoptimized={true}
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
          <div className="flex-1 min-w-0">
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
                  <p className={`text-base md:text-lg text-white/70 leading-relaxed font-light ${!isExpanded && cast.biography.length > 350 ? 'line-clamp-6' : ''}`}>
                    {cast.biography}
                  </p>
                  {cast.biography.length > 350 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-3 text-brand font-black text-[10px] md:text-xs uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-white/40 italic mb-12 uppercase text-xs tracking-widest">No biography available for this artist.</p>
              )}

              {/* Image Gallery */}
              {cast.images && cast.images.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand"></span> GALLERY
                  </h3>
                  <div 
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                  >
                    {cast.images.slice(0, 8).map((img, idx) => (
                      <div 
                        key={idx} 
                        className="w-40 sm:w-48 md:w-56 shrink-0 aspect-[2/3] relative rounded-xl overflow-hidden cursor-pointer group snap-start"
                        onClick={() => setSelectedImage(img)}
                        draggable={false}
                      >
                        <Image
                          src={img}
                          alt={`${cast.name} gallery image ${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          draggable={false}
                          unoptimized={true}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                          <span className="text-white font-bold text-sm tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">View</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Movies Done */}
              <div>
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-2">
                  <span className="w-1 h-3 bg-brand"></span> KNOWN FOR
                </h3>
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 transition-opacity duration-300 ${isMoviesLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-8"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-brand hover:text-black rounded-full text-white transition-all z-50"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Nav Button */}
            {cast.images && cast.images.indexOf(selectedImage) > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(cast.images![cast.images!.indexOf(selectedImage) - 1]);
                }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-brand hover:text-black rounded-full text-white transition-all z-50 group"
              >
                <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[90vh] w-full h-full rounded-2xl overflow-hidden shadow-2xl"
            >
              <Image
                src={selectedImage}
                alt={`${cast.name} fullscreen`}
                fill
                className="object-contain"
                quality={100}
                priority
                unoptimized={true}
              />
            </motion.div>

            {/* Right Nav Button */}
            {cast.images && cast.images.indexOf(selectedImage) < cast.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(cast.images![cast.images!.indexOf(selectedImage) + 1]);
                }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-brand hover:text-black rounded-full text-white transition-all z-50 group"
              >
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
