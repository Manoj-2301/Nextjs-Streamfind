export interface Platform {
  name: string;
  logo: string;
  logoUrl?: string;
  watchUrl: string;
  isSponsored?: boolean;
  countries?: string[];
  watchUrls?: Record<string, string>;
}

export interface CastMember {
  id?: number;
  name: string;
  role: string;
  imageUrl: string;
  biography?: string;
  birthday?: string;
  placeOfBirth?: string;
}

export interface Movie {
  id: number;
  title: string;
  year: number;
  releaseDate?: string;
  genre: string[];
  rating: number;
  description: string;
  runtime: string;
  tagline?: string;
  posterUrl: string;
  backdropUrl: string;
  platforms: Platform[];
  cast: CastMember[];
  crew?: CastMember[];
  trailerYoutubeId?: string;
  trailerSite?: string;
  type?: 'movie' | 'tv';
  originalLanguage?: string;
  language?: string;
}
