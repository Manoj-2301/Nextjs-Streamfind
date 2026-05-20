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
const parseWatchProviders = (watchProvidersObj: any, movieId: number, title?: string): Platform[] => {
  if (!watchProvidersObj || !watchProvidersObj.results) {
    return getMoviePlatforms(movieId);
  }
  const results = watchProvidersObj.results;

  const allProviders: { prov: any; link: string; region: string }[] = [];

  // Iterate over all region keys to aggregate all available platforms globally
  for (const region of Object.keys(results)) {
    const regionData = results[region];
    if (regionData && typeof regionData === 'object') {
      const regionLink = regionData.link || 'https://www.themoviedb.org';
      const lists = [
        ...(regionData.flatrate || []),
        ...(regionData.rent || []),
        ...(regionData.buy || [])
      ];
      for (const prov of lists) {
        allProviders.push({ prov, link: regionLink, region });
      }
    }
  }

  if (allProviders.length === 0) {
    return getMoviePlatforms(movieId);
  }

  const mapped = allProviders.map(({ prov, link, region }) => {
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
    } else if (lowerName.includes('viki')) {
      name = 'Viki';
    } else if (lowerName.includes('viu')) {
      name = 'Viu';
    }

    const watchUrl = link || 'https://www.themoviedb.org';

    return {
      name,
      logo: prov.logo_path ? `https://image.tmdb.org/t/p/original${prov.logo_path}` : 'https://placehold.co/100x100?text=Logo',
      watchUrl,
      region
    };
  });

  const unique: Platform[] = [];
  const seen = new Map<string, Platform>();
  for (const p of mapped) {
    if (!seen.has(p.name)) {
      const newPlatform: Platform = {
        name: p.name,
        logo: p.logo,
        watchUrl: p.watchUrl,
        countries: [p.region],
        watchUrls: { [p.region]: p.watchUrl }
      };
      seen.set(p.name, newPlatform);
      unique.push(newPlatform);
    } else {
      const existing = seen.get(p.name);
      if (existing) {
        if (existing.countries && !existing.countries.includes(p.region)) {
          existing.countries.push(p.region);
        }
        if (!existing.watchUrls) {
          existing.watchUrls = {};
        }
        existing.watchUrls[p.region] = p.watchUrl;
      }
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
    let errorMsg = `Failed to fetch from TMDB: ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = `TMDB Error: ${errData.error} ${errData.details ? `(${errData.details})` : ''}`;
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
};

const fetchGenres = async () => {
  if (Object.keys(genresMap).length > 0) return;
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      fetchFromTmdb('genre/movie/list'),
      fetchFromTmdb('genre/tv/list')
    ]);
    movieGenres.genres.forEach((g: any) => {
      genresMap[g.id] = g.name;
    });
    tvGenres.genres.forEach((g: any) => {
      genresMap[g.id] = g.name;
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
  }
};

const extractTrailer = (videosObj: any): { key?: string; site?: string } => {
  if (!videosObj || !videosObj.results || videosObj.results.length === 0) {
    return {};
  }
  const results = videosObj.results;

  // 1. Look for type === 'Trailer' (YouTube first, then Vimeo, then others)
  const trailerYoutube = results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
  if (trailerYoutube) return { key: trailerYoutube.key, site: 'YouTube' };

  const trailerVimeo = results.find((v: any) => v.type === 'Trailer' && v.site === 'Vimeo');
  if (trailerVimeo) return { key: trailerVimeo.key, site: 'Vimeo' };

  const trailerAny = results.find((v: any) => v.type === 'Trailer');
  if (trailerAny) return { key: trailerAny.key, site: trailerAny.site };

  // 2. Look for type === 'Teaser' (YouTube first, then Vimeo, then others)
  const teaserYoutube = results.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube');
  if (teaserYoutube) return { key: teaserYoutube.key, site: 'YouTube' };

  const teaserVimeo = results.find((v: any) => v.type === 'Teaser' && v.site === 'Vimeo');
  if (teaserVimeo) return { key: teaserVimeo.key, site: 'Vimeo' };

  const teaserAny = results.find((v: any) => v.type === 'Teaser');
  if (teaserAny) return { key: teaserAny.key, site: teaserAny.site };

  // 3. Look for type === 'Clip' or 'Featurette' (YouTube first, then Vimeo, then others)
  const clipYoutube = results.find((v: any) => (v.type === 'Clip' || v.type === 'Featurette') && v.site === 'YouTube');
  if (clipYoutube) return { key: clipYoutube.key, site: 'YouTube' };

  const clipVimeo = results.find((v: any) => (v.type === 'Clip' || v.type === 'Featurette') && v.site === 'Vimeo');
  if (clipVimeo) return { key: clipVimeo.key, site: 'Vimeo' };

  // 4. Fallback to any video at all
  const firstVideo = results[0];
  if (firstVideo) return { key: firstVideo.key, site: firstVideo.site };

  return {};
};

const mapTmdbMovie = (tmdbMovie: any): Movie => {
  let posterPath = tmdbMovie.poster_path;
  if (!posterPath && tmdbMovie.images?.posters && tmdbMovie.images.posters.length > 0) {
    posterPath = tmdbMovie.images.posters[1]?.file_path || tmdbMovie.images.posters[0]?.file_path;
  }

  const trailerInfo = extractTrailer(tmdbMovie.videos);

  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title || tmdbMovie.original_title || 'Unknown Movie',
    year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 0,
    genre: tmdbMovie.genre_ids ? tmdbMovie.genre_ids.map((id: number) => genresMap[id] || 'Unknown') : (tmdbMovie.genres ? tmdbMovie.genres.map((g: any) => g.name) : []),
    rating: Number(tmdbMovie.vote_average?.toFixed(1) || 0),
    description: tmdbMovie.overview || '',
    runtime: tmdbMovie.runtime ? `${Math.floor(tmdbMovie.runtime / 60)}H ${tmdbMovie.runtime % 60}M` : 'N/A',
    posterUrl: posterPath ? `${POSTER_IMAGE_BASE_URL}${posterPath}` : 'https://placehold.co/500x750?text=No+Poster',
    backdropUrl: tmdbMovie.backdrop_path ? `${BACKDROP_IMAGE_BASE_URL}${tmdbMovie.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop',
    platforms: tmdbMovie['watch/providers']
      ? parseWatchProviders(tmdbMovie['watch/providers'], tmdbMovie.id, tmdbMovie.title || tmdbMovie.original_title)
      : getMoviePlatforms(tmdbMovie.id),
    cast: [],
    trailerYoutubeId: trailerInfo.key,
    trailerSite: trailerInfo.site,
    type: 'movie'
  };
};

const mapTmdbTvShow = (tmdbTv: any): Movie => {
  const runtime = tmdbTv.episode_run_time && tmdbTv.episode_run_time.length > 0
    ? `${tmdbTv.episode_run_time[0]} Min`
    : (tmdbTv.number_of_seasons ? `${tmdbTv.number_of_seasons} Season${tmdbTv.number_of_seasons > 1 ? 's' : ''}` : 'N/A');

  let posterPath = tmdbTv.poster_path;
  if (!posterPath && tmdbTv.images?.posters && tmdbTv.images.posters.length > 0) {
    posterPath = tmdbTv.images.posters[1]?.file_path || tmdbTv.images.posters[0]?.file_path;
  }

  const trailerInfo = extractTrailer(tmdbTv.videos);

  return {
    id: tmdbTv.id,
    title: tmdbTv.name || tmdbTv.original_name || 'Unknown Show',
    year: tmdbTv.first_air_date ? new Date(tmdbTv.first_air_date).getFullYear() : 0,
    genre: tmdbTv.genre_ids ? tmdbTv.genre_ids.map((id: number) => genresMap[id] || 'Unknown') : (tmdbTv.genres ? tmdbTv.genres.map((g: any) => g.name) : []),
    rating: Number(tmdbTv.vote_average?.toFixed(1) || 0),
    description: tmdbTv.overview || '',
    runtime,
    posterUrl: posterPath ? `${POSTER_IMAGE_BASE_URL}${posterPath}` : 'https://placehold.co/500x750?text=No+Poster',
    backdropUrl: tmdbTv.backdrop_path ? `${BACKDROP_IMAGE_BASE_URL}${tmdbTv.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop',
    platforms: tmdbTv['watch/providers']
      ? parseWatchProviders(tmdbTv['watch/providers'], tmdbTv.id, tmdbTv.name || tmdbTv.original_name)
      : getMoviePlatforms(tmdbTv.id),
    cast: [],
    trailerYoutubeId: trailerInfo.key,
    trailerSite: trailerInfo.site,
    type: 'tv'
  };
};

export const getTrendingMovies = async (): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb('trending/all/day');

    const itemsToProcess = data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 10);
      
    const moviesWithTrailers = [];
    for (const item of itemsToProcess) {
      try {
        const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=videos,watch/providers,images`);
        const mapped = item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);

        moviesWithTrailers.push({
          ...mapped,
          runtime: item.media_type === 'tv'
            ? (detailData.episode_run_time && detailData.episode_run_time.length > 0 ? `${detailData.episode_run_time[0]} Min` : 'N/A')
            : (detailData.runtime ? `${Math.floor(detailData.runtime / 60)}H ${detailData.runtime % 60}M` : 'N/A'),
        });
      } catch (error) {
        console.error(`Error fetching details for trending item ${item.id}:`, error);
        moviesWithTrailers.push(item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item));
      }
    }
    return moviesWithTrailers;
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    throw error;
  }
};

export const getTvDetails = async (id: number): Promise<Movie> => {
  await fetchGenres();
  const tvData = await fetchFromTmdb(`tv/${id}?append_to_response=videos,credits,watch/providers,images`);

  const cast: CastMember[] = tvData.credits?.cast?.slice(0, 10).map((c: any) => ({
    id: c.id,
    name: c.name,
    role: c.character,
    imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image'
  })) || [];

  return {
    ...mapTmdbTvShow(tvData),
    genre: tvData.genres?.map((g: any) => g.name) || [],
    runtime: tvData.episode_run_time && tvData.episode_run_time.length > 0 
      ? `${tvData.episode_run_time[0]} Min` 
      : (tvData.number_of_seasons ? `${tvData.number_of_seasons} Season${tvData.number_of_seasons > 1 ? 's' : ''}` : 'N/A'),
    tagline: tvData.tagline,
    cast
  };
};

export const getMovieDetails = async (id: number, type?: 'movie' | 'tv'): Promise<Movie> => {
  await fetchGenres();

  if (type === 'tv') {
    try {
      return await getTvDetails(id);
    } catch (e) {
      console.error(`Error fetching TV details for ${id}:`, e);
    }
  }

  try {
    const movieData = await fetchFromTmdb(`movie/${id}?append_to_response=videos,credits,watch/providers,images`);

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
      cast
    };
  } catch (error) {
    if (type !== 'tv') {
      try {
        return await getTvDetails(id);
      } catch (tvError) {
        console.error('Error fetching details from both Movie and TV endpoints:', tvError);
      }
    }
    console.error('Error fetching movie details:', error);
    throw error;
  }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  if (!query) return [];
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`search/multi?query=${encodeURIComponent(query)}`);

    const moviesWithDetails = await Promise.all(
      data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 10)
        .map(async (item: any) => {
          try {
            const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
            return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
          } catch (e) {
            return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
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
    let tvGenreId = genreId;
    if (genreId === 28 || genreId === 12) {
      tvGenreId = 10759;
    } else if (genreId === 14 || genreId === 878) {
      tvGenreId = 10765;
    } else if (genreId === 10752) {
      tvGenreId = 10768;
    }

    const [movieData, tvData] = await Promise.all([
      fetchFromTmdb(`discover/movie?with_genres=${genreId}`),
      genreId === 10770 ? Promise.resolve({ results: [] }) : fetchFromTmdb(`discover/tv?with_genres=${tvGenreId}`)
    ]);

    const combined = [
      ...movieData.results.map((r: any) => ({ ...r, media_type: 'movie' })),
      ...tvData.results.map((r: any) => ({ ...r, media_type: 'tv' }))
    ];
    combined.sort((a, b) => b.popularity - a.popularity);

    const itemsWithDetails = await Promise.all(
      combined.slice(0, 10).map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
          return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
        } catch (e) {
          return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
        }
      })
    );
    return itemsWithDetails;
  } catch (error) {
    console.error('Error fetching items by genre:', error);
    return [];
  }
};

export const browseSearchMovies = async (query: string, page: number = 1): Promise<{ movies: Movie[], totalPages: number }> => {
  if (!query) return { movies: [], totalPages: 0 };
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`search/multi?query=${encodeURIComponent(query)}&page=${page}`);

    const moviesWithDetails = await Promise.all(
      data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map(async (item: any) => {
          try {
            const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
            return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
          } catch (e) {
            return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
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
    const movieParams = new URLSearchParams();
    const tvParams = new URLSearchParams();

    movieParams.set('page', page.toString());
    tvParams.set('page', page.toString());

    if (minRating) {
      movieParams.set('vote_average.gte', minRating.toString());
      tvParams.set('vote_average.gte', minRating.toString());
    }
    if (minYear) {
      movieParams.set('primary_release_date.gte', `${minYear}-01-01`);
      tvParams.set('first_air_date.gte', `${minYear}-01-01`);
    }
    if (maxYear) {
      movieParams.set('primary_release_date.lte', `${maxYear}-12-31`);
      tvParams.set('first_air_date.lte', `${maxYear}-12-31`);
    }

    let tmdbSort = 'popularity.desc';
    if (sortBy === 'rating') tmdbSort = 'vote_average.desc';
    if (sortBy === 'year') tmdbSort = 'primary_release_date.desc';
    movieParams.set('sort_by', tmdbSort);
    tvParams.set('sort_by', tmdbSort === 'primary_release_date.desc' ? 'first_air_date.desc' : tmdbSort);

    let tvGenreId = genreId;
    if (genreId) {
      if (genreId === 28 || genreId === 12) {
        tvGenreId = 10759;
      } else if (genreId === 14 || genreId === 878) {
        tvGenreId = 10765;
      } else if (genreId === 10752) {
        tvGenreId = 10768;
      }
    }

    if (genreId) movieParams.set('with_genres', genreId.toString());
    if (tvGenreId) tvParams.set('with_genres', tvGenreId.toString());

    const shouldFetchTv = genreId !== 10770; // 10770 is TV Movie (movie only)

    const [movieData, tvData] = await Promise.all([
      fetchFromTmdb(`discover/movie?${movieParams.toString()}`),
      shouldFetchTv ? fetchFromTmdb(`discover/tv?${tvParams.toString()}`) : Promise.resolve({ results: [], total_pages: 0 })
    ]);

    const mappedMovies = movieData.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    const mappedTv = tvData.results.map((item: any) => ({ ...item, media_type: 'tv' }));

    let combinedResults = [...mappedMovies, ...mappedTv];
    if (sortBy === 'rating') {
      combinedResults.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'year') {
      const getYear = (item: any) => {
        const dateStr = item.release_date || item.first_air_date || '';
        return dateStr ? new Date(dateStr).getTime() : 0;
      };
      combinedResults.sort((a, b) => getYear(b) - getYear(a));
    } else {
      combinedResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    const pageResults = combinedResults.slice(0, 20);

    const moviesWithDetails = await Promise.all(
      pageResults.map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
          return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
        } catch (e) {
          return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
        }
      })
    );

    return {
      movies: moviesWithDetails,
      totalPages: Math.min(Math.max(movieData.total_pages || 0, tvData.total_pages || 0), 500)
    };
  } catch (error) {
    console.error('Error in browseDiscoverMovies:', error);
    return { movies: [], totalPages: 0 };
  }
};

export const getRecommendations = async (movieId: number, type?: 'movie' | 'tv'): Promise<Movie[]> => {
  await fetchGenres();
  const resolvedType = type || 'movie';
  try {
    const data = await fetchFromTmdb(`${resolvedType}/${movieId}/recommendations`);

    const moviesWithDetails = await Promise.all(
      data.results.map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`${resolvedType}/${item.id}?append_to_response=watch/providers,images`);
          return resolvedType === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
        } catch (e) {
          return resolvedType === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
        }
      })
    );
    return moviesWithDetails;
  } catch (error) {
    if (!type) {
      try {
        return await getRecommendations(movieId, 'tv');
      } catch (tvError) {
        console.error('Error fetching recommendations for both:', tvError);
      }
    }
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

export const getPopularMovies = async (): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const [movieData, tvData] = await Promise.all([
      fetchFromTmdb('movie/popular'),
      fetchFromTmdb('tv/popular')
    ]);

    const combined = [
      ...movieData.results.map((r: any) => ({ ...r, media_type: 'movie' })),
      ...tvData.results.map((r: any) => ({ ...r, media_type: 'tv' }))
    ];
    combined.sort((a, b) => b.popularity - a.popularity);

    const itemsWithDetails = await Promise.all(
      combined.slice(0, 20).map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
          return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
        } catch (e) {
          return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
        }
      })
    );
    return itemsWithDetails;
  } catch (error) {
    console.error('Error fetching popular items:', error);
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
    const data = await fetchFromTmdb(`person/${id}/combined_credits`);
    const castItems = data.cast
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .sort((a: any, b: any) => b.popularity - a.popularity)
      .slice(0, 12);

    const itemsWithDetails = await Promise.all(
      castItems.map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
          return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
        } catch (e) {
          return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
        }
      })
    );
    return itemsWithDetails;
  } catch (error) {
    console.error('Error fetching cast credits:', error);
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

export const getMovieAdditionalDetails = async (movieId: number, type?: 'movie' | 'tv'): Promise<MovieAdditionalDetails> => {
  const resolvedType = type || 'movie';
  try {
    const [creditsData, reviewsData] = await Promise.all([
      fetchFromTmdb(`${resolvedType}/${movieId}/credits`),
      fetchFromTmdb(`${resolvedType}/${movieId}/reviews`)
    ]);

    const directorInfo = creditsData.crew?.find((member: any) => member.job === 'Director') ||
      creditsData.crew?.find((member: any) => member.job === 'Executive Producer') ||
      creditsData.crew?.find((member: any) => member.job === 'Writer');
    const review = reviewsData.results?.[0];

    return {
      director: directorInfo?.name,
      topCriticReview: review ? {
        author: review.author,
        content: review.content
      } : undefined
    };
  } catch (error) {
    if (!type) {
      try {
        return await getMovieAdditionalDetails(movieId, 'tv');
      } catch (tvError) {
        console.error('Error fetching additional details for both:', tvError);
      }
    }
    console.error('Error fetching additional movie details:', error);
    return {};
  }
};

export interface CriticReview {
  author: string;
  content: string;
}

export const getMovieReviews = async (movieId: number, type?: 'movie' | 'tv'): Promise<CriticReview[]> => {
  const resolvedType = type || 'movie';
  try {
    const data = await fetchFromTmdb(`${resolvedType}/${movieId}/reviews`);
    return data.results.map((r: any) => ({
      author: r.author,
      content: r.content
    }));
  } catch (error) {
    if (!type) {
      try {
        return await getMovieReviews(movieId, 'tv');
      } catch (tvError) {
        console.error('Error fetching reviews for both:', tvError);
      }
    }
    console.error('Error fetching movie reviews from TMDB:', error);
    return [];
  }
};
