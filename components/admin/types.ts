
/*
 * ============================================================
 * TYPES
 * ============================================================
 */
export interface AdminUser {
  id: string;
  email?: string;
  displayName?: string;
  bio?: string;
  favoriteGenres?: string[];
  subscriptions?: string[];
  avatarFrame?: string;
  top10?: any[];
  photoURL?: string;
  status?: string;
  flagged?: boolean;
  lastActive?: any;
  newsletterOptIn?: boolean;
}

export interface AdminRating {
  id: string;
  userId: string;
  movieId: string;
  rating: number;
  movieTitle?: string;
  moviePoster?: string;
  reviewText?: string;
  updatedAt?: any;
  liked?: boolean;
  approved?: boolean;
}

export interface FeaturedCuration {
  id: string;
  slotNo: string;
  type: string;
  movieId: string;
  movieTitle: string;
  movieImage: string;
  movieOverview?: string;
  mediaType: 'movie' | 'tv';
  updatedAt?: any;
}
