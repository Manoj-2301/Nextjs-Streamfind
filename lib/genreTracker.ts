'use client';

import { Movie } from '@/types';

const METRICS_KEY = 'streamfind_genre_metrics_v2';

interface GenreMetrics {
  searched: Record<string, number>;
  viewed: Record<string, number>;
}

// Get the initial empty metrics structure
function getInitialMetrics(): GenreMetrics {
  return {
    searched: {},
    viewed: {},
  };
}

// Retrieve metrics from localStorage safely (with SSR safety)
export function getSavedMetrics(): GenreMetrics {
  if (typeof window === 'undefined') return getInitialMetrics();
  try {
    const saved = localStorage.getItem(METRICS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading genre metrics:', e);
  }
  return getInitialMetrics();
}

// Save metrics to localStorage safely
function saveMetrics(metrics: GenreMetrics) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch (e) {
    console.error('Error saving genre metrics:', e);
  }
}

// Track when genres are searched or filtered
export function trackGenreSearch(genres: string | string[]) {
  if (!genres) return;
  const genresArray = Array.isArray(genres) ? genres : [genres];
  if (genresArray.length === 0) return;

  const metrics = getSavedMetrics();
  genresArray.forEach((g) => {
    const normalized = normalizeGenreName(g);
    if (normalized) {
      metrics.searched[normalized] = (metrics.searched[normalized] || 0) + 1;
    }
  });
  saveMetrics(metrics);
}

// Track when genres are viewed (details page or clicked)
export function trackGenreView(genres: string | string[]) {
  if (!genres) return;
  const genresArray = Array.isArray(genres) ? genres : [genres];
  if (genresArray.length === 0) return;

  const metrics = getSavedMetrics();
  genresArray.forEach((g) => {
    const normalized = normalizeGenreName(g);
    if (normalized) {
      metrics.viewed[normalized] = (metrics.viewed[normalized] || 0) + 1;
    }
  });
  saveMetrics(metrics);
}

// Radar genres to display
export const RADAR_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Thriller',
];

// Helper to normalize different TMDB/user inputs into one of the 8 main radar categories
export function normalizeGenreName(genre: string): string | null {
  if (!genre) return null;
  const name = genre.toLowerCase();
  
  // Find which of our target RADAR_GENRES matches the input string
  const matched = RADAR_GENRES.find((rg) => {
    const target = rg.toLowerCase();
    return name.includes(target) || target.includes(name);
  });
  
  if (matched) return matched;
  
  // Specific alias mappings
  if (name.includes('science fiction') || name.includes('cyberpunk') || name.includes('post-apocalyptic')) return 'Sci-Fi';
  if (name.includes('romantic')) return 'Romance';
  if (name.includes('suspense') || name.includes('mystery')) return 'Thriller';
  if (name.includes('funny') || name.includes('humor')) return 'Comedy';
  if (name.includes('action') || name.includes('fight') || name.includes('neo-noir')) return 'Action';
  
  return null;
}

// Compute the composite score for the Radar Chart
export function computeRadarData(watchlist: Movie[]): { genre: string; A: number; fullMark: number }[] {
  const metrics = getSavedMetrics();

  // 1. Calculate watchlist count per genre
  const watchlistCounts: Record<string, number> = {};
  RADAR_GENRES.forEach((g) => {
    watchlistCounts[g] = 0;
  });

  watchlist.forEach((m) => {
    m.genre?.forEach((g) => {
      const normalized = normalizeGenreName(g);
      if (normalized && normalized in watchlistCounts) {
        watchlistCounts[normalized] += 1;
      }
    });
  });

  // 2. Map metrics into raw scores
  const rawScores = RADAR_GENRES.map((genre) => {
    const watchlistCount = watchlistCounts[genre] || 0;
    const viewCount = metrics.viewed[genre] || 0;
    const searchCount = metrics.searched[genre] || 0;
    const baseScore = 15; // Small initial shape for aesthetic appeal
    return baseScore + (watchlistCount * 30) + (viewCount * 12) + (searchCount * 6);
  });

  // 3. Normalize against the highest score (with a minimum max of 150)
  const maxScore = Math.max(150, ...rawScores);

  return RADAR_GENRES.map((genre, idx) => {
    // Normalize to max 150 to fit the chart boundary cleanly
    const score = (rawScores[idx] / maxScore) * 150;
    
    return {
      genre,
      A: score,
      fullMark: 150,
    };
  });
}

export interface UserActivity {
  id: string;
  timestamp: number;
  action: string;
  detail: string;
}

export function logUserActivity(action: string, detail: string) {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem('streamfind_user_activities');
    let list: UserActivity[] = saved ? JSON.parse(saved) : [];
    
    // Add new activity at the beginning
    list.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      action,
      detail
    });
    
    // Limit to 20 activities
    list = list.slice(0, 20);
    localStorage.setItem('streamfind_user_activities', JSON.stringify(list));
  } catch (e) {
    console.error('Error logging user activity:', e);
  }
}

export function getUserActivities(): UserActivity[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('streamfind_user_activities');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error getting user activities:', e);
    return [];
  }
}

export function clearUserActivities() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('streamfind_user_activities');
  } catch (e) {
    console.error('Error clearing user activities:', e);
  }
}
