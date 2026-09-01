/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import { useQuery, useQueries, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { 
  getTrendingMovies, 
  getUpcomingMovies, 
  getMoviesByGenre, 
  getNowPlayingMovies, 
  getPopularMovies, 
  getRecommendations,
  getMovieDetails,
  searchPeople,
  getCastDetails,
  getCastMovies,
  searchMovies,
  browseSearchMovies,
  browseDiscoverMovies,
  getPopularPeople
} from '@/services/tmdbService';
import { ProfileSettings, Movie } from '@/types';

// Query Keys object for consistency
export const tmdbKeys = {
  all: ['tmdb'] as const,
  trending: (profile?: ProfileSettings) => [...tmdbKeys.all, 'trending', profile] as const,
  upcoming: (profile?: ProfileSettings) => [...tmdbKeys.all, 'upcoming', profile] as const,
  genre: (genreId: number, profile?: ProfileSettings) => [...tmdbKeys.all, 'genre', genreId, profile] as const,
  nowPlaying: (profile?: ProfileSettings) => [...tmdbKeys.all, 'nowPlaying', profile] as const,
  popular: (profile?: ProfileSettings) => [...tmdbKeys.all, 'popular', profile] as const,
  recommendations: (movieId: number) => [...tmdbKeys.all, 'recommendations', movieId] as const,
  movieDetails: (id: number, type?: 'movie' | 'tv') => [...tmdbKeys.all, 'movieDetails', id, type] as const,
  searchMovies: (query: string) => [...tmdbKeys.all, 'searchMovies', query] as const,
  searchPeople: (query: string) => [...tmdbKeys.all, 'searchPeople', query] as const,
};

// Custom Hooks

export const useTrendingMovies = (profile?: ProfileSettings) => {
  return useQuery({
    queryKey: tmdbKeys.trending(profile),
    queryFn: ({ signal }) => getTrendingMovies(profile, { signal }),
  });
};

export const useUpcomingMovies = (profile?: ProfileSettings) => {
  return useQuery({
    queryKey: tmdbKeys.upcoming(profile),
    queryFn: ({ signal }) => getUpcomingMovies(profile, { signal }),
  });
};

export const useMoviesByGenre = (genreId: number, profile?: ProfileSettings) => {
  return useQuery({
    queryKey: tmdbKeys.genre(genreId, profile),
    queryFn: ({ signal }) => getMoviesByGenre(genreId, profile, { signal }),
  });
};

export const useNowPlayingMovies = (profile?: ProfileSettings) => {
  return useQuery({
    queryKey: tmdbKeys.nowPlaying(profile),
    queryFn: ({ signal }) => getNowPlayingMovies(profile, { signal }),
  });
};

export const usePopularMovies = (profile?: ProfileSettings) => {
  return useQuery({
    queryKey: tmdbKeys.popular(profile),
    queryFn: ({ signal }) => getPopularMovies(profile, { signal }),
  });
};

export const useRecommendations = (movieId: number) => {
  return useQuery({
    queryKey: tmdbKeys.recommendations(movieId),
    queryFn: ({ signal }) => getRecommendations(movieId, undefined, { signal }),
    enabled: !!movieId,
  });
};

export const useMovieDetails = (id: number, type?: 'movie' | 'tv', options?: Omit<UseQueryOptions<Movie, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Movie, Error>({
    queryKey: tmdbKeys.movieDetails(id, type),
    queryFn: ({ signal }) => getMovieDetails(id, type, { signal }),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    ...options,
  });
};

export const useSearchMovies = (query: string) => {
  return useQuery({
    queryKey: tmdbKeys.searchMovies(query),
    queryFn: () => searchMovies(query),
    enabled: !!query,
  });
};

export const useSearchPeople = (query: string) => {
  return useQuery({
    queryKey: tmdbKeys.searchPeople(query),
    queryFn: () => searchPeople(query),
    enabled: !!query,
  });
};

export const useCastDetails = (personId: number) => {
  return useQuery({
    queryKey: [...tmdbKeys.all, 'castDetails', personId],
    queryFn: () => getCastDetails(personId),
    enabled: !!personId,
  });
};

export const useCastMovies = (personId: number, page: number = 1) => {
  return useQuery({
    queryKey: [...tmdbKeys.all, 'castMovies', personId, page],
    queryFn: () => getCastMovies(personId, page),
    enabled: !!personId,
  });
};

export const useBrowseSearchMovies = (query: string, page: number = 1, yearRange?: [number, number] | null) => {
  return useQuery({
    queryKey: [...tmdbKeys.all, 'browseSearch', query, page, yearRange],
    queryFn: () => browseSearchMovies(query, page, yearRange),
    enabled: !!query,
  });
};

export const useBrowseDiscoverMovies = (
  page: number,
  genreId?: number,
  minRating?: number,
  minYear?: number,
  maxYear?: number,
  sortBy?: string,
  language?: string,
  providerIds?: number[],
  watchRegion?: string,
  contentType?: 'movies' | 'tv' | 'both',
  initialData?: { movies: Movie[], totalPages: number }
) => {
  return useQuery({
    queryKey: [...tmdbKeys.all, 'browseDiscover', page, genreId, minRating, minYear, maxYear, sortBy, language, providerIds, watchRegion, contentType],
    queryFn: () => browseDiscoverMovies(page, genreId, minRating, minYear, maxYear, sortBy, language, providerIds, watchRegion, contentType),
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutes staleness to prevent refetching on mount
  });
};

export const usePopularPeople = (page: number = 1) => {
  return useQuery({
    queryKey: [...tmdbKeys.all, 'popularPeople', page],
    queryFn: () => getPopularPeople(page),
  });
};
