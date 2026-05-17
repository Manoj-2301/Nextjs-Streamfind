import { Movie, Platform, CastMember } from '@/types';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

// Mock platforms since TMDB doesn't provide direct watch URLs for all regions easily without Watch Providers API
const MOCK_PLATFORMS: Platform[] = [
    { name: 'Netflix', logo: 'https://www.edigitalagency.com.au/wp-content/uploads/Netflix-logo-red-black-png.png', watchUrl: 'https://www.netflix.com' },
    { name: 'Amazon Prime', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', watchUrl: 'https://www.amazon.com/gp/video/storefront' },
    { name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/1200px-Disney%2B_logo.svg.png', watchUrl: 'https://www.disneyplus.com' },
    { name: 'Apple TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/2560px-Apple_TV_Plus_Logo.svg.png', watchUrl: 'https://tv.apple.com' },
];

let genresMap: Record<number, string> = {};

const fetchGenres = async () => {
    if (Object.keys(genresMap).length > 0) return;
    try {
        const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
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
        genre: tmdbMovie.genre_ids ? tmdbMovie.genre_ids.map((id: number) => genresMap[id] || 'Unknown') : [],
        rating: Number(tmdbMovie.vote_average.toFixed(1)),
        description: tmdbMovie.overview,
        runtime: 'N/A',
        posterUrl: tmdbMovie.poster_path ? `${IMAGE_BASE_URL}${tmdbMovie.poster_path}` : 'https://placehold.co/500x750?text=No+Poster',
        backdropUrl: tmdbMovie.backdrop_path ? `${IMAGE_BASE_URL}${tmdbMovie.backdrop_path}` : 'https://placehold.co/1920x1080?text=No+Backdrop',
        platforms: [...MOCK_PLATFORMS].sort(() => 0.5 - Math.random()).slice(0, 2),
        cast: [],
    };
};

export const getTrendingMovies = async (): Promise<Movie[]> => {
    if (!TMDB_API_KEY) {
        console.warn('NEXT_PUBLIC_TMDB_API_KEY is missing');
        return [];
    }
    await fetchGenres();
    try {
        const response = await fetch(`${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`);
        const data = await response.json();

        const moviesWithTrailers = await Promise.all(
            data.results.map(async (movie: any) => {
                try {
                    const videoRes = await fetch(`${BASE_URL}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`);
                    const videoData = await videoRes.json();
                    const trailer = videoData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
                        videoData.results?.find((v: any) => v.site === 'YouTube');

                    return {
                        ...mapTmdbMovie(movie),
                        trailerYoutubeId: trailer?.key
                    };
                } catch (error) {
                    console.error(`Error fetching video for movie ${movie.id}:`, error);
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
    if (!TMDB_API_KEY) throw new Error('API key missing');
    await fetchGenres();
    try {
        const [movieRes, videosRes, creditsRes] = await Promise.all([
            fetch(`${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`),
            fetch(`${BASE_URL}/movie/${id}/videos?api_key=${TMDB_API_KEY}`),
            fetch(`${BASE_URL}/movie/${id}/credits?api_key=${TMDB_API_KEY}`)
        ]);

        const movieData = await movieRes.json();
        const videosData = await videosRes.json();
        const creditsData = await creditsRes.json();

        const trailer = videosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
            videosData.results?.find((v: any) => v.site === 'YouTube');
        const cast: CastMember[] = creditsData.cast.slice(0, 10).map((c: any) => ({
            id: c.id,
            name: c.name,
            role: c.character,
            imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://placehold.co/200x300?text=No+Image'
        }));

        return {
            ...mapTmdbMovie(movieData),
            genre: movieData.genres.map((g: any) => g.name),
            runtime: movieData.runtime ? `${Math.floor(movieData.runtime / 60)}H ${movieData.runtime % 60}M` : 'N/A',
            tagline: movieData.tagline,
            trailerYoutubeId: trailer?.key,
            cast,
            platforms: [
                { ...MOCK_PLATFORMS[0], isSponsored: true },
                ...MOCK_PLATFORMS.slice(1, 4)
            ]
        };
    } catch (error) {
        console.error('Error fetching movie details:', error);
        throw error;
    }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
    if (!TMDB_API_KEY || !query) return [];
    await fetchGenres();
    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.results.map(mapTmdbMovie);
    } catch (error) {
        console.error('Error searching movies:', error);
        return [];
    }
};

export const getMoviesByGenre = async (genreId: number): Promise<Movie[]> => {
  if (!TMDB_API_KEY) return [];
  await fetchGenres();
  try {
    const response = await fetch(`${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}`);
    const data = await response.json();
    return data.results.map(mapTmdbMovie);
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
};

export const browseSearchMovies = async (query: string, page: number = 1): Promise<{movies: Movie[], totalPages: number}> => {
  if (!TMDB_API_KEY || !query) return { movies: [], totalPages: 0 };
  await fetchGenres();
  try {
    const response = await fetch(`${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`);
    const data = await response.json();
    return {
      movies: data.results.map(mapTmdbMovie),
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
): Promise<{movies: Movie[], totalPages: number}> => {
  if (!TMDB_API_KEY) return { movies: [], totalPages: 0 };
  await fetchGenres();
  
  try {
    let url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}`;
    
    if (genreId) url += `&with_genres=${genreId}`;
    if (minRating) url += `&vote_average.gte=${minRating}`;
    if (minYear) url += `&primary_release_date.gte=${minYear}-01-01`;
    if (maxYear) url += `&primary_release_date.lte=${maxYear}-12-31`;
    
    let tmdbSort = 'popularity.desc';
    if (sortBy === 'rating') tmdbSort = 'vote_average.desc';
    if (sortBy === 'year') tmdbSort = 'primary_release_date.desc';
    url += `&sort_by=${tmdbSort}`;

    const response = await fetch(url);
    const data = await response.json();
    
    return {
      movies: data.results.map(mapTmdbMovie),
      totalPages: Math.min(data.total_pages, 500)
    };
  } catch (error) {
    console.error('Error in browseDiscoverMovies:', error);
    return { movies: [], totalPages: 0 };
  }
};

export const getRecommendations = async (movieId: number): Promise<Movie[]> => {
    if (!TMDB_API_KEY) return [];
    await fetchGenres();
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        return data.results.map(mapTmdbMovie);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
    }
};

export const getPopularMovies = async (): Promise<Movie[]> => {
    if (!TMDB_API_KEY) return [];
    await fetchGenres();
    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        return data.results.map(mapTmdbMovie);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        return [];
    }
};

export const getCastDetails = async (id: number): Promise<CastMember> => {
    if (!TMDB_API_KEY) throw new Error('API key missing');
    try {
        const response = await fetch(`${BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        return {
            id: data.id,
            name: data.name,
            role: '',
            imageUrl: data.profile_path ? `${IMAGE_BASE_URL}${data.profile_path}` : 'https://placehold.co/500x750?text=No+Image',
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
    if (!TMDB_API_KEY) return [];
    await fetchGenres();
    try {
        const response = await fetch(`${BASE_URL}/person/${id}/movie_credits?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        return data.cast.sort((a: any, b: any) => b.popularity - a.popularity).slice(0, 12).map(mapTmdbMovie);
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
    if (!TMDB_API_KEY) return {};
    try {
        const [creditsRes, reviewsRes] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`),
            fetch(`${BASE_URL}/movie/${movieId}/reviews?api_key=${TMDB_API_KEY}`)
        ]);

        const creditsData = await creditsRes.json();
        const reviewsData = await reviewsRes.json();

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
    if (!TMDB_API_KEY) return [];
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/reviews?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        return data.results.map((r: any) => ({
            author: r.author,
            content: r.content
        }));
    } catch (error) {
        console.error('Error fetching movie reviews from TMDB:', error);
        return [];
    }
};
