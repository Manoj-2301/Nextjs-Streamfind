export interface Platform {
  name: string;
  logo: string;
  watchUrl: string;
  isSponsored?: boolean;
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
  genre: string[];
  rating: number;
  description: string;
  runtime: string;
  tagline?: string;
  posterUrl: string;
  backdropUrl: string;
  platforms: Platform[];
  cast: CastMember[];
  trailerYoutubeId?: string;
}
