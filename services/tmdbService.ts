import { Movie, Platform, CastMember } from '@/types';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Mock platforms fallback if TMDB watch providers are completely empty
const MOCK_PLATFORMS: Platform[] = [
  { name: 'Netflix', logo: 'https://www.edigitalagency.com.au/wp-content/uploads/Netflix-logo-red-black-png.png', watchUrl: 'https://www.netflix.com' },
  { name: 'Amazon Prime', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', watchUrl: 'https://www.amazon.com/gp/video/storefront' },
  { name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/1200px-Disney%2B_logo.svg.png', watchUrl: 'https://www.disneyplus.com' },
  { name: 'Apple TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/2560px-Apple_TV_Plus_Logo.svg.png', watchUrl: 'https://tv.apple.com' },
];

const getMoviePlatforms = (movieId: number): Platform[] => {
  const idx1 = movieId % MOCK_PLATFORMS.length;
  let idx2 = (movieId + 1) % MOCK_PLATFORMS.length;
  if (idx1 === idx2) {
    idx2 = (movieId + 2) % MOCK_PLATFORMS.length;
  }
  return [MOCK_PLATFORMS[idx1], MOCK_PLATFORMS[idx2]];
};

// Parser to extract and normalize real watch providers from TMDB API
const parseWatchProviders = (watchProvidersObj: any, movieId: number): Platform[] => {
  if (!watchProvidersObj || !watchProvidersObj.results) {
    return getMoviePlatforms(movieId);
  }
  const results = watchProvidersObj.results;

  // Check preferred regions
  const regions = ['US', 'IN', 'GB', 'CA'];
  let selectedRegionData = null;

  for (const r of regions) {
    if (results[r] && (results[r].flatrate || results[r].rent || results[r].buy)) {
      selectedRegionData = results[r];
      break;
    }
  }

  if (!selectedRegionData) {
    const availableRegion = Object.keys(results).find(k => results[k] && (results[k].flatrate || results[k].rent || results[k].buy));
    if (availableRegion) {
      selectedRegionData = results[availableRegion];
    }
  }

  if (!selectedRegionData) {
    return getMoviePlatforms(movieId);
  }

  const providers = selectedRegionData.flatrate || selectedRegionData.rent || selectedRegionData.buy || [];
  if (providers.length === 0) {
    return getMoviePlatforms(movieId);
  }

  const mapped: Platform[] = providers.map((prov: any) => {
    let name = prov.provider_name;
    const lowerName = name.toLowerCase();

    if (lowerName.includes('netflix')) {
      name = 'Netflix';
    } else if (lowerName.includes('prime') || lowerName.includes('amazon')) {
      name = 'Amazon Prime';
    } else if (lowerName.includes('disney') || lowerName.includes('hotstar')) {
      name = 'Disney+';
    } else if (lowerName.includes('apple') || lowerName.includes('itunes')) {
      name = 'Apple TV';
    }

    let watchUrl = selectedRegionData.link || 'https://www.themoviedb.org';
    if (name === 'Netflix') watchUrl = 'https://www.netflix.com';
    else if (name === 'Amazon Prime') watchUrl = 'https://www.amazon.com/gp/video/storefront';
    else if (name === 'Disney+') watchUrl = 'https://www.disneyplus.com';
    else if (name === 'Apple TV') watchUrl = 'https://tv.apple.com';

    return {
      name,
      logo: prov.logo_path ? `https://image.tmdb.org/t/p/original${prov.logo_path}` : 'https://placehold.co/100x100?text=Logo',
      watchUrl
    };
  });

  const unique: Platform[] = [];
  const seen = new Set<string>();
  for (const p of mapped) {
    if (!seen.has(p.name)) {
      seen.add(p.name);
      unique.push(p);
    }
  }

  return unique;
};

let genresMap: Record<number, string> = {};

const fetchFromTmdb = async (pathAndParams: string): Promise<any> => {
  const isServer = typeof window === 'undefined';
  let url = '';

  if (isServer) {
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const separator = pathAndParams.includes('?') ? '&' : '?';
    url = `${BASE_URL}/${pathAndParams}${separator}api_key=${apiKey}`;
  } else {
    url = `/api/tmdb/${pathAndParams}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from TMDB: ${response.statusText}`);
  }
  return response.json();
};

const fetchGenres = async () => {
  if (Object.keys(genresMap).length > 0) return;
  try {
    const data = await fetchFromTmdb('genre/movie/list');
    data.genres.forEach((g: any) => {
      genresMap[g.id] = g.name;
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
  }
};

const mapTmdbMovie = (tmdbMovie: any): Movie => {
  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title,
    year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 0,
    genre: tmdbMovie.genre_ids ? tmdbMovie.genre_ids.map((id: number) => genresMap[id] || 'Unknown') : (tmdbMovie.genres ? tmdbMovie.genres.map((g: any) => g.name) : []),
    rating: Number(tmdbMovie.vote_average?.toFixed(1) || 0),
    description: tmdbMovie.overview,
    runtime: tmdbMovie.runtime ? `${Math.floor(tmdbMovie.runtime / 60)}H ${tmdbMovie.runtime % 60}M` : 'N/A',
    posterUrl: tmdbMovie.poster_path ? `${POSTER_IMAGE_BASE_URL}${tmdbMovie.poster_path}` : 'https://placehold.co/500x750?text=No+Poster',
    backdropUrl: tmdbMovie.backdrop_path ? `${BACKDROP_IMAGE_BASE_URL}${tmdbMovie.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop',
    platforms: tmdbMovie['watch/providers']
      ? parseWatchProviders(tmdbMovie['watch/providers'], tmdbMovie.id)
      : getMoviePlatforms(tmdbMovie.id),
    cast: [],
  };
};

export const getTrendingMovies = async (): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb('trending/movie/day');

    const moviesWithTrailers = await Promise.all(
      data.results.map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=videos,watch/providers`);

          const trailer = detailData.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
            detailData.videos?.results?.find((v: any) => v.site === 'YouTube');

          return {
            ...mapTmdbMovie(detailData),
            trailerYoutubeId: trailer?.key,
            runtime: detailData.runtime ? `${Math.floor(detailData.runtime / 60)}H ${detailData.runtime % 60}M` : 'N/A',
          };
        } catch (error) {
          console.error(`Error fetching details for movie ${movie.id}:`, error);
          return mapTmdbMovie(movie);
        }
      })
    );
    return moviesWithTrailers;
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    throw error;
  }
};

export const getMovieDetails = async (id: number): Promise<Movie> => {
  await fetchGenres();
  try {
    const movieData = await fetchFromTmdb(`movie/${id}?append_to_response=videos,credits,watch/providers`);

    const trailer = movieData.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
      movieData.videos?.results?.find((v: any) => v.site === 'YouTube');

    const cast: CastMember[] = movieData.credits?.cast?.slice(0, 10).map((c: any) => ({
      id: c.id,
      name: c.name,
      role: c.character,
      imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image'
    })) || [];

    return {
      ...mapTmdbMovie(movieData),
      genre: movieData.genres?.map((g: any) => g.name) || [],
      runtime: movieData.runtime ? `${Math.floor(movieData.runtime / 60)}H ${movieData.runtime % 60}M` : 'N/A',
      tagline: movieData.tagline,
      trailerYoutubeId: trailer?.key,
      cast
    };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  if (!query) return [];
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`search/movie?query=${encodeURIComponent(query)}`);

    const moviesWithDetails = await Promise.all(
      data.results.slice(0, 10).map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );
    return moviesWithDetails;
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

export const getMoviesByGenre = async (genreId: number): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`discover/movie?with_genres=${genreId}`);

    const moviesWithDetails = await Promise.all(
      data.results.slice(0, 10).map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );
    return moviesWithDetails;
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
};

export const browseSearchMovies = async (query: string, page: number = 1): Promise<{ movies: Movie[], totalPages: number }> => {
  if (!query) return { movies: [], totalPages: 0 };
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`search/movie?query=${encodeURIComponent(query)}&page=${page}`);

    const moviesWithDetails = await Promise.all(
      data.results.map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );

    return {
      movies: moviesWithDetails,
      totalPages: Math.min(data.total_pages, 500)
    };
  } catch (error) {
    console.error('Error in browseSearchMovies:', error);
    return { movies: [], totalPages: 0 };
  }
};

export const browseDiscoverMovies = async (
  page: number = 1,
  genreId?: number,
  minRating?: number,
  minYear?: number,
  maxYear?: number,
  sortBy: string = 'popularity.desc'
): Promise<{ movies: Movie[], totalPages: number }> => {
  await fetchGenres();

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', page.toString());

    if (genreId) queryParams.set('with_genres', genreId.toString());
    if (minRating) queryParams.set('vote_average.gte', minRating.toString());
    if (minYear) queryParams.set('primary_release_date.gte', `${minYear}-01-01`);
    if (maxYear) queryParams.set('primary_release_date.lte', `${maxYear}-12-31`);

    let tmdbSort = 'popularity.desc';
    if (sortBy === 'rating') tmdbSort = 'vote_average.desc';
    if (sortBy === 'year') tmdbSort = 'primary_release_date.desc';
    queryParams.set('sort_by', tmdbSort);

    const data = await fetchFromTmdb(`discover/movie?${queryParams.toString()}`);

    const moviesWithDetails = await Promise.all(
      data.results.map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );

    return {
      movies: moviesWithDetails,
      totalPages: Math.min(data.total_pages, 500)
    };
  } catch (error) {
    console.error('Error in browseDiscoverMovies:', error);
    return { movies: [], totalPages: 0 };
  }
};

export const getRecommendations = async (movieId: number): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`movie/${movieId}/recommendations`);

    const moviesWithDetails = await Promise.all(
      data.results.map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );
    return moviesWithDetails;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

export const getPopularMovies = async (): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb('movie/popular');

    const moviesWithDetails = await Promise.all(
      data.results.map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );
    return moviesWithDetails;
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
};

export const getCastDetails = async (id: number): Promise<CastMember> => {
  try {
    const data = await fetchFromTmdb(`person/${id}`);
    return {
      id: data.id,
      name: data.name,
      role: '',
      imageUrl: data.profile_path ? `${PROFILE_IMAGE_BASE_URL}${data.profile_path}` : 'https://placehold.co/500x750?text=No+Image',
      biography: data.biography,
      birthday: data.birthday,
      placeOfBirth: data.place_of_birth
    };
  } catch (error) {
    console.error('Error fetching cast details:', error);
    throw error;
  }
};

export const getCastMovies = async (id: number): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`person/${id}/movie_credits`);
    const castMovies = data.cast.sort((a: any, b: any) => b.popularity - a.popularity).slice(0, 12);

    const moviesWithDetails = await Promise.all(
      castMovies.map(async (movie: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${movie.id}?append_to_response=watch/providers`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(movie);
        }
      })
    );
    return moviesWithDetails;
  } catch (error) {
    console.error('Error fetching cast movies:', error);
    return [];
  }
};

export interface MovieAdditionalDetails {
  director?: string;
  topCriticReview?: {
    author: string;
    content: string;
  };
}

export const getMovieAdditionalDetails = async (movieId: number): Promise<MovieAdditionalDetails> => {
  try {
    const [creditsData, reviewsData] = await Promise.all([
      fetchFromTmdb(`movie/${movieId}/credits`),
      fetchFromTmdb(`movie/${movieId}/reviews`)
    ]);

    const directorInfo = creditsData.crew?.find((member: any) => member.job === 'Director');
    const review = reviewsData.results?.[0];

    return {
      director: directorInfo?.name,
      topCriticReview: review ? {
        author: review.author,
        content: review.content
      } : undefined
    };
  } catch (error) {
    console.error('Error fetching additional movie details:', error);
    return {};
  }
};

export interface CriticReview {
  author: string;
  content: string;
}

export const getMovieReviews = async (movieId: number): Promise<CriticReview[]> => {
  try {
    const data = await fetchFromTmdb(`movie/${movieId}/reviews`);
    return data.results.map((r: any) => ({
      author: r.author,
      content: r.content
    }));
  } catch (error) {
    console.error('Error fetching movie reviews from TMDB:', error);
    return [];
  }
};
