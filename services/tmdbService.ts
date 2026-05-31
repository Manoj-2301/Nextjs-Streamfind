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
    return [];
  }
  const results = watchProvidersObj.results;

  const allProviders: { prov: any; link: string; region: string }[] = [];

  // Iterate over select regions to avoid massive JSON payloads in SSR HTML
  const topRegions = ['US', 'IN', 'GB', 'CA', 'AU'];
  for (const region of Object.keys(results)) {
    if (!topRegions.includes(region)) continue;
    
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
    return [];
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

  let finalPathAndParams = pathAndParams;
  if (finalPathAndParams.includes('append_to_response=') && finalPathAndParams.includes('videos')) {
    finalPathAndParams += '&include_video_language=en,te,ta,hi,ml,kn,mr,bn,gu,pa,ur,zh,ja,ko,es,fr,de,it,pt,ru,null';
  }

  if (isServer) {
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const separator = finalPathAndParams.includes('?') ? '&' : '?';
    url = `${BASE_URL}/${finalPathAndParams}${separator}api_key=${apiKey}`;
  } else {
    url = `/api/tmdb/${finalPathAndParams}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    let errorMsg = `Failed to fetch from TMDB: ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = `TMDB Error: ${errData.error} ${errData.details ? `(${errData.details})` : ''}`;
      } else if (errData && errData.status_message) {
        errorMsg = `TMDB Error: ${errData.status_message}`;
      }
    } catch (_) {}
    if (response.status === 404) {
      errorMsg = 'TMDB API error: Not Found';
    }
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

const extractTrailer = (videosObj: any, originalLanguage?: string): { key?: string; site?: string } => {
  if (!videosObj || !videosObj.results || videosObj.results.length === 0) {
    return {};
  }
  let results = videosObj.results;

  if (originalLanguage) {
    const langResults = results.filter((v: any) => v.iso_639_1 === originalLanguage);
    if (langResults.length > 0) {
      results = langResults;
    }
  }

  // 1. Look for type === 'Teaser' (YouTube first, then Vimeo, then others)
  const teaserYoutube = results.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube');
  if (teaserYoutube) return { key: teaserYoutube.key, site: 'YouTube' };

  const teaserVimeo = results.find((v: any) => v.type === 'Teaser' && v.site === 'Vimeo');
  if (teaserVimeo) return { key: teaserVimeo.key, site: 'Vimeo' };

  const teaserAny = results.find((v: any) => v.type === 'Teaser');
  if (teaserAny) return { key: teaserAny.key, site: teaserAny.site };

  // 2. Look for type === 'Trailer' (YouTube first, then Vimeo, then others)
  const trailerYoutube = results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
  if (trailerYoutube) return { key: trailerYoutube.key, site: 'YouTube' };

  const trailerVimeo = results.find((v: any) => v.type === 'Trailer' && v.site === 'Vimeo');
  if (trailerVimeo) return { key: trailerVimeo.key, site: 'Vimeo' };

  const trailerAny = results.find((v: any) => v.type === 'Trailer');
  if (trailerAny) return { key: trailerAny.key, site: trailerAny.site };

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

  const trailerInfo = extractTrailer(tmdbMovie.videos, tmdbMovie.original_language);

  let fullLanguage = tmdbMovie.original_language;
  if (fullLanguage) {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      fullLanguage = displayNames.of(fullLanguage);
    } catch (e) {}
  }

  return {
    id: tmdbMovie.id,
    title: tmdbMovie.title || tmdbMovie.original_title || 'Unknown Movie',
    year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 0,
    releaseDate: tmdbMovie.release_date,
    genre: tmdbMovie.genre_ids ? tmdbMovie.genre_ids.map((id: number) => genresMap[id] || 'Unknown') : (tmdbMovie.genres ? tmdbMovie.genres.map((g: any) => g.name) : []),
    rating: Number(tmdbMovie.vote_average?.toFixed(1) || 0),
    description: tmdbMovie.overview || '',
    runtime: tmdbMovie.runtime ? `${Math.floor(tmdbMovie.runtime / 60)}H ${tmdbMovie.runtime % 60}M` : 'N/A',
    posterUrl: posterPath ? `${POSTER_IMAGE_BASE_URL}${posterPath}` : 'https://placehold.co/500x750?text=No+Poster',
    backdropUrl: tmdbMovie.backdrop_path ? `${BACKDROP_IMAGE_BASE_URL}${tmdbMovie.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop',
    platforms: tmdbMovie['watch/providers']
      ? parseWatchProviders(tmdbMovie['watch/providers'], tmdbMovie.id, tmdbMovie.title || tmdbMovie.original_title)
      : [],
    cast: [],
    trailerYoutubeId: trailerInfo.key,
    trailerSite: trailerInfo.site,
    type: 'movie',
    originalLanguage: fullLanguage,
    language: tmdbMovie.original_language?.toUpperCase()
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

  const trailerInfo = extractTrailer(tmdbTv.videos, tmdbTv.original_language);

  let fullLanguage = tmdbTv.original_language;
  if (fullLanguage) {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      fullLanguage = displayNames.of(fullLanguage);
    } catch (e) {}
  }

  return {
    id: tmdbTv.id,
    title: tmdbTv.name || tmdbTv.original_name || 'Unknown Show',
    year: tmdbTv.first_air_date ? new Date(tmdbTv.first_air_date).getFullYear() : 0,
    releaseDate: tmdbTv.first_air_date,
    genre: tmdbTv.genre_ids ? tmdbTv.genre_ids.map((id: number) => genresMap[id] || 'Unknown') : (tmdbTv.genres ? tmdbTv.genres.map((g: any) => g.name) : []),
    rating: Number(tmdbTv.vote_average?.toFixed(1) || 0),
    description: tmdbTv.overview || '',
    runtime,
    posterUrl: posterPath ? `${POSTER_IMAGE_BASE_URL}${posterPath}` : 'https://placehold.co/500x750?text=No+Poster',
    backdropUrl: tmdbTv.backdrop_path ? `${BACKDROP_IMAGE_BASE_URL}${tmdbTv.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop',
    platforms: tmdbTv['watch/providers']
      ? parseWatchProviders(tmdbTv['watch/providers'], tmdbTv.id, tmdbTv.name || tmdbTv.original_name)
      : [],
    cast: [],
    trailerYoutubeId: trailerInfo.key,
    trailerSite: trailerInfo.site,
    type: 'tv',
    originalLanguage: fullLanguage,
    language: tmdbTv.original_language?.toUpperCase()
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

  let basicCast = tvData.credits?.cast || [];

  // For anthology/aggregate cast shows (like Charmsukh) where top-level credits are empty,
  // fall back to fetching the aggregate_credits endpoint (matching TMDB website behavior)
  if (basicCast.length === 0) {
    try {
      const aggCredits = await fetchFromTmdb(`tv/${id}/aggregate_credits`);
      if (aggCredits && aggCredits.cast) {
        basicCast = aggCredits.cast.map((c: any) => ({
          ...c,
          character: c.roles && c.roles.length > 0 ? c.roles[0].character : c.character
        }));
      }
    } catch (e) {
      console.error(`Error fetching aggregate credits for TV show ${id}:`, e);
    }
  }

  const sliceCast = basicCast.slice(0, 10);
  const cast: CastMember[] = await Promise.all(
    sliceCast.map(async (c: any) => {
      let birthday, placeOfBirth;
      try {
        const personData = await fetchFromTmdb(`person/${c.id}`);
        birthday = personData.birthday;
        placeOfBirth = personData.place_of_birth;
      } catch (err) {
        // Ignore error and just return what we have
      }
      return {
        id: c.id,
        name: c.name,
        role: c.character,
        imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image',
        birthday,
        placeOfBirth
      };
    })
  );

  const uniqueCrew = Array.from(new Map(
    (tvData.credits?.crew || [])
      // .filter((c: any) => c.department === 'Directing' || c.department === 'Writing')
      .filter((c: any) => c.job === 'Director' || (c.department === 'Directing' && !c.job.includes('Assistant')))
      .map((c: any) => [c.id, c])
  ).values()).slice(0, 10);

  const crew: CastMember[] = uniqueCrew.map((c: any) => ({
    id: c.id,
    name: c.name,
    role: c.job || c.department,
    imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image'
  }));

  return {
    ...mapTmdbTvShow(tvData),
    genre: tvData.genres?.map((g: any) => g.name) || [],
    runtime: tvData.episode_run_time && tvData.episode_run_time.length > 0 
      ? `${tvData.episode_run_time[0]} Min` 
      : (tvData.number_of_seasons ? `${tvData.number_of_seasons} Season${tvData.number_of_seasons > 1 ? 's' : ''}` : 'N/A'),
    tagline: tvData.tagline,
    cast,
    crew
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

    const basicCast = movieData.credits?.cast?.slice(0, 10) || [];
    const cast: CastMember[] = await Promise.all(
      basicCast.map(async (c: any) => {
        let birthday, placeOfBirth;
        try {
          const personData = await fetchFromTmdb(`person/${c.id}`);
          birthday = personData.birthday;
          placeOfBirth = personData.place_of_birth;
        } catch (err) {
          // Ignore error and just return what we have
        }
        return {
          id: c.id,
          name: c.name,
          role: c.character,
          imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image',
          birthday,
          placeOfBirth
        };
      })
    );

    const uniqueCrew = Array.from(new Map(
      (movieData.credits?.crew || [])
        // .filter((c: any) => c.department === 'Directing' || c.department === 'Writing')
        .filter((c: any) => c.job === 'Director')
        .map((c: any) => [c.id, c])
    ).values()).slice(0, 10);

    const crew: CastMember[] = uniqueCrew.map((c: any) => ({
      id: c.id,
      name: c.name,
      role: c.job || c.department,
      imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image'
    }));

    return {
      ...mapTmdbMovie(movieData),
      genre: movieData.genres?.map((g: any) => g.name) || [],
      runtime: movieData.runtime ? `${Math.floor(movieData.runtime / 60)}H ${movieData.runtime % 60}M` : 'N/A',
      tagline: movieData.tagline,
      cast,
      crew
    };
  } catch (error: any) {
    if (type !== 'tv') {
      try {
        return await getTvDetails(id);
      } catch (tvError: any) {
        if (!tvError.message?.includes('Not Found')) {
          console.error('Error fetching details from both Movie and TV endpoints:', tvError);
        }
      }
    }
    if (!error.message?.includes('Not Found')) {
      console.error('Error fetching movie details:', error);
    }
    throw error;
  }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  if (!query) return [];
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`search/multi?query=${encodeURIComponent(query)}`);

    const person = data.results?.find((item: any) => item.media_type === 'person');
    let personCredits: any[] = [];
    if (person) {
      try {
        const creditsData = await fetchFromTmdb(`person/${person.id}/combined_credits`);
        const castCredits = creditsData.cast || [];
        const crewCredits = creditsData.crew || [];
        personCredits = [...castCredits, ...crewCredits].map((c: any) => ({
          ...c,
          media_type: c.media_type || (c.title || c.original_title ? 'movie' : 'tv')
        }));
      } catch (err) {
        console.error('Error fetching person credits in searchMovies:', err);
      }
    }

    // Extract movies/shows from results and/or personCredits
    let processedResults: any[] = [];
    if (personCredits.length > 0) {
      processedResults.push(...personCredits);
    }

    data.results?.forEach((item: any) => {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        processedResults.push(item);
      } else if (item.media_type === 'person') {
        // If it's not the primary person we fetched credits for, or if credits fetch failed, add its known_for
        if (item.id !== person?.id && item.known_for) {
          item.known_for.forEach((kf: any) => {
            if (kf.media_type === 'movie' || kf.media_type === 'tv') {
              processedResults.push(kf);
            }
          });
        }
      }
    });

    // De-duplicate items by id + media_type
    const seenKeys = new Set<string>();
    const uniqueResults: any[] = [];
    processedResults.forEach((item) => {
      const mediaType = item.media_type || (item.title || item.original_title ? 'movie' : 'tv');
      const key = `${mediaType}-${item.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueResults.push({
          ...item,
          media_type: mediaType
        });
      }
    });

    // Sort by popularity descending
    uniqueResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const moviesWithDetails = await Promise.all(
      uniqueResults
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

export const browseSearchMovies = async (query: string, page: number = 1, yearRange?: [number, number] | null): Promise<{ movies: Movie[], totalPages: number }> => {
  if (!query) return { movies: [], totalPages: 0 };
  const sanitizedPage = Math.max(1, Math.min(500, Math.floor(Number(page) || 1)));
  await fetchGenres();
  try {
    let actualQuery = query.trim();
    let exactYear: number | undefined;
    
    // Check if a 4 digit year is present in the query
    const yearMatch = actualQuery.match(/\b(187[4-9]|18[8-9]\d|19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      const parsedYear = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      if (parsedYear >= 1874 && parsedYear <= currentYear + 10) {
        const cleanQuery = actualQuery.replace(yearMatch[0], '').replace(/\s+/g, ' ').trim();
        // Only extract the year if there is still a query title left
        if (cleanQuery) {
          actualQuery = cleanQuery;
          exactYear = parsedYear;
        }
      }
    }

    let dataResults: any[] = [];
    let totalPages = 0;

    if (exactYear) {
      // Use specific movie/tv search with year
      const [movieData, tvData] = await Promise.all([
        fetchFromTmdb(`search/movie?query=${encodeURIComponent(actualQuery)}&primary_release_year=${exactYear}&page=${sanitizedPage}`),
        fetchFromTmdb(`search/tv?query=${encodeURIComponent(actualQuery)}&first_air_date_year=${exactYear}&page=${sanitizedPage}`)
      ]);
      dataResults = [
        ...movieData.results.map((r: any) => ({ ...r, media_type: 'movie' })),
        ...tvData.results.map((r: any) => ({ ...r, media_type: 'tv' }))
      ];
      dataResults.sort((a, b) => b.popularity - a.popularity);
      totalPages = Math.max(movieData.total_pages || 0, tvData.total_pages || 0);
    } else {
      // Normal multi search, check page 1 first to detect if it's a person search
      const data = await fetchFromTmdb(`search/multi?query=${encodeURIComponent(actualQuery)}&page=1`);
      const person = data.results?.find((item: any) => item.media_type === 'person');

      if (person) {
        let personCredits: any[] = [];
        try {
          const creditsData = await fetchFromTmdb(`person/${person.id}/combined_credits`);
          const castCredits = creditsData.cast || [];
          const crewCredits = creditsData.crew || [];
          personCredits = [...castCredits, ...crewCredits].map((c: any) => ({
            ...c,
            media_type: c.media_type || (c.title || c.original_title ? 'movie' : 'tv')
          }));
        } catch (err) {
          console.error('Error fetching person credits in browseSearchMovies:', err);
        }

        // Merge credits with other search results from page 1
        let processedResults: any[] = [];
        if (personCredits.length > 0) {
          processedResults.push(...personCredits);
        }

        data.results?.forEach((item: any) => {
          if (item.media_type === 'movie' || item.media_type === 'tv') {
            processedResults.push(item);
          } else if (item.media_type === 'person') {
            if (item.id !== person.id && item.known_for) {
              item.known_for.forEach((kf: any) => {
                if (kf.media_type === 'movie' || kf.media_type === 'tv') {
                  processedResults.push(kf);
                }
              });
            }
          }
        });

        // De-duplicate items by id + media_type
        const seenKeys = new Set<string>();
        let uniqueResults: any[] = [];
        processedResults.forEach((item) => {
          const mediaType = item.media_type || (item.title || item.original_title ? 'movie' : 'tv');
          const key = `${mediaType}-${item.id}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueResults.push({
              ...item,
              media_type: mediaType
            });
          }
        });

        // Sort by popularity descending
        uniqueResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        // Apply yearRange filter locally if provided
        if (yearRange) {
          const [min, max] = yearRange;
          uniqueResults = uniqueResults.filter((item: any) => {
            const dateStr = item.release_date || item.first_air_date;
            if (!dateStr) return false;
            const y = parseInt(dateStr.split('-')[0]);
            return y >= min && y <= max;
          });
        }

        // Local pagination
        const total = uniqueResults.length;
        totalPages = Math.ceil(total / 20);
        
        dataResults = uniqueResults.slice((sanitizedPage - 1) * 20, sanitizedPage * 20);
      } else {
        // Standard flow when no person is matched
        // If sanitizedPage is 1, reuse the 'data' we already fetched
        let pageData = data;
        if (sanitizedPage !== 1) {
          pageData = await fetchFromTmdb(`search/multi?query=${encodeURIComponent(actualQuery)}&page=${sanitizedPage}`);
        }

        // Extract movie/tv shows from results
        let processedResults: any[] = [];
        pageData.results?.forEach((item: any) => {
          if (item.media_type === 'movie' || item.media_type === 'tv') {
            processedResults.push(item);
          } else if (item.media_type === 'person' && item.known_for) {
            item.known_for.forEach((kf: any) => {
              if (kf.media_type === 'movie' || kf.media_type === 'tv') {
                processedResults.push(kf);
              }
            });
          }
        });

        // De-duplicate items by id + media_type
        const seenKeys = new Set<string>();
        let uniqueResults: any[] = [];
        processedResults.forEach((item) => {
          const mediaType = item.media_type || (item.title || item.original_title ? 'movie' : 'tv');
          const key = `${mediaType}-${item.id}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueResults.push({
              ...item,
              media_type: mediaType
            });
          }
        });

        dataResults = uniqueResults;
        totalPages = pageData.total_pages || 0;

        // Apply yearRange filter locally if provided
        if (yearRange) {
          const [min, max] = yearRange;
          dataResults = dataResults.filter((item: any) => {
            const dateStr = item.release_date || item.first_air_date;
            if (!dateStr) return false;
            const y = parseInt(dateStr.split('-')[0]);
            return y >= min && y <= max;
          });
        }
      }
    }

    const moviesWithDetails = await Promise.all(
      dataResults
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 20)
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
      totalPages: Math.min(totalPages, 500)
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
  sortBy: string = 'popularity.desc',
  language: string = 'All',
  watchProviderIds?: number[],
  watchRegion?: string
): Promise<{ movies: Movie[], totalPages: number }> => {
  const sanitizedPage = Math.max(1, Math.min(500, Math.floor(Number(page) || 1)));
  await fetchGenres();

  try {
    const movieParams = new URLSearchParams();
    const tvParams = new URLSearchParams();

    movieParams.set('page', sanitizedPage.toString());
    tvParams.set('page', sanitizedPage.toString());

    if (watchProviderIds && watchProviderIds.length > 0 && watchRegion) {
      movieParams.set('with_watch_providers', watchProviderIds.join('|'));
      movieParams.set('watch_region', watchRegion);
      tvParams.set('with_watch_providers', watchProviderIds.join('|'));
      tvParams.set('watch_region', watchRegion);
    }

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

    if (language && language !== 'All') {
      movieParams.set('with_original_language', language);
      tvParams.set('with_original_language', language);
    }

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

export const getUpcomingMovies = async (): Promise<Movie[]> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb('movie/upcoming?region=IN|US');

    // We only have movies in upcoming, no TV shows
    const itemsToProcess = data.results.slice(0, 20);

    const moviesWithTrailers = await Promise.all(
      itemsToProcess.map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`movie/${item.id}?append_to_response=videos,watch/providers,images`);
          return mapTmdbMovie(detailData);
        } catch (e) {
          return mapTmdbMovie(item);
        }
      })
    );
    return moviesWithTrailers;
  } catch (error) {
    console.error('Error fetching upcoming movies:', error);
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

export const getCastMovies = async (id: number, page: number = 1): Promise<{ items: Movie[], totalPages: number, currentPage: number }> => {
  await fetchGenres();
  try {
    const data = await fetchFromTmdb(`person/${id}/combined_credits`);
    const castItems = data.cast
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .sort((a: any, b: any) => b.popularity - a.popularity);

    // De-duplicate items by id to prevent duplicate keys in React (common for anthology show roles)
    const seenIds = new Set<number>();
    const uniqueCastItems = castItems.filter((item: any) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    const ITEMS_PER_PAGE = 12;
    const totalItems = uniqueCastItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedItems = uniqueCastItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const itemsWithDetails = await Promise.all(
      paginatedItems.map(async (item: any) => {
        try {
          const detailData = await fetchFromTmdb(`${item.media_type}/${item.id}?append_to_response=watch/providers,images`);
          return item.media_type === 'tv' ? mapTmdbTvShow(detailData) : mapTmdbMovie(detailData);
        } catch (e) {
          return item.media_type === 'tv' ? mapTmdbTvShow(item) : mapTmdbMovie(item);
        }
      })
    );
    return { items: itemsWithDetails, totalPages, currentPage: page };
  } catch (error) {
    console.error('Error fetching cast credits:', error);
    return { items: [], totalPages: 0, currentPage: 1 };
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

export interface WatchProvider {
  id: number;
  name: string;
}

export const getWatchProviders = async (region?: string): Promise<WatchProvider[]> => {
  try {
    const regionParam = region ? `?watch_region=${region}` : '';
    const [movieData, tvData] = await Promise.all([
      fetchFromTmdb(`watch/providers/movie${regionParam}`),
      fetchFromTmdb(`watch/providers/tv${regionParam}`)
    ]);
    const providersMap = new Map<number, string>();
    movieData.results?.forEach((p: any) => {
      if (p.provider_id && p.provider_name) {
        providersMap.set(p.provider_id, p.provider_name);
      }
    });
    tvData.results?.forEach((p: any) => {
      if (p.provider_id && p.provider_name) {
        providersMap.set(p.provider_id, p.provider_name);
      }
    });
    
    // De-duplicate by normalized lowercase/trimmed provider name to prevent duplicate keys in UI
    const uniqueByName = new Map<string, WatchProvider>();
    Array.from(providersMap.entries()).forEach(([id, name]) => {
      const cleanName = name.trim();
      const normKey = cleanName.toLowerCase();
      if (!uniqueByName.has(normKey)) {
        uniqueByName.set(normKey, { id, name: cleanName });
      }
    });

    return Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    const fallbackNames = ["Netflix", "Amazon Prime", "Disney+", "Apple TV", "HBO Max", "Hotstar", "Peacock"];
    return fallbackNames.map((name, idx) => ({ id: idx, name }));
  }
};
