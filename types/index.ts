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

export interface ProfileSettings {
  bio?: string;
  favoriteGenres?: string[];
  subscriptions?: string[];
  notifyNewRelease?: boolean;
  notifyFavGenres?: boolean;
  notifyLeavingSoon?: boolean;
  isPublic?: boolean;
  avatarFrame?: 'none' | 'neon' | 'gold' | 'ghost';
  top10?: any[];
  autoFilter?: boolean;
  photoURL?: string;
  email?: string;
  displayName?: string;
  weeklyDigest?: boolean;
  watchRegion?: string;
  notifyNewEpisodes?: boolean;
  notifyNewSeasons?: boolean;
  notifyPlatformAdded?: boolean;
  notifyNewFeatures?: boolean;
  notifyTrendingGenres?: boolean;
  notifyWatchHistoryRecs?: boolean;
  notifySimilarContent?: boolean;
  channelEmail?: boolean;
  channelPush?: boolean;
  channelBrowser?: boolean;
  prefLanguage?: string;
  prefContentType?: 'movies' | 'tv' | 'both';
  dnaMoods?: string[];
  dnaRuntime?: '90m' | '120m' | 'none';
  dnaMinRating?: number;
  securityAlertNewDevice?: boolean;
  securityAlertSuspicious?: boolean;
  securityAlertProfileChange?: boolean;
  securityAlertWeeklyDigest?: boolean;
}
