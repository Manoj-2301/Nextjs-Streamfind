import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminUser, AdminRating, FeaturedCuration } from '@/components/admin/types';
import { ContactQuery } from '@/components/admin/ContactQueriesView';
import {
  subscribeToContactQueries,
  subscribeToFeaturedCurations,
  subscribeToUsers,
  subscribeToRatings
} from '@/services/firebase/adminService';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

export function useAdminData() {
  const { user } = useAuth();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [curations, setCurations] = useState<FeaturedCuration[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.email !== 'mt398401@gmail.com') return;
    
    let active = true;
    setIsDataLoading(true);
    setError(null);

    // Sync users with Firebase Auth to purge deleted users
    const syncUsers = async () => {
      try {
        const auth = getAuth(app);
        const token = await auth.currentUser?.getIdToken();
        
        await fetch('/api/admin/sync-users', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.warn('Failed to sync users with auth:', e);
      }
    };
    syncUsers();

    const handleError = (err: Error) => {
      if (active) setError(err.message);
    };

    const unsubQueries = subscribeToContactQueries(
      (items) => { if (active) setQueries(items); },
      handleError
    );

    const unsubCurations = subscribeToFeaturedCurations(
      (items) => { if (active) setCurations(items); },
      handleError
    );

    const unsubUsers = subscribeToUsers(
      (items) => { if (active) setUsers(items); },
      handleError
    );

    const unsubRatings = subscribeToRatings(
      (items) => { 
        if (!active) return;
        setRatings([...items]);
        setIsDataLoading(false);

        // Asynchronously fetch missing movie titles from TMDB API proxy
        const ratingsMissingTitles = items.filter(r => !r.movieTitle && r.movieId);
        if (ratingsMissingTitles.length > 0) {
          import('@/services/tmdbService').then(({ getMovieDetails }) => {
            Promise.all(
              ratingsMissingTitles.map(async (r) => {
                try {
                  const movie = await getMovieDetails(Number(r.movieId));
                  if (movie && movie.title) {
                    return { userId: r.userId, movieId: r.movieId, title: movie.title };
                  }
                } catch (e) {
                  console.warn(`Failed to resolve title for movie ID ${r.movieId}:`, e);
                }
                return null;
              })
            ).then((resolved) => {
              const titleMap = new Map<string, string>();
              resolved.forEach((item) => {
                if (item) {
                  titleMap.set(`${item.userId}_${item.movieId}`, item.title);
                }
              });
              if (titleMap.size > 0 && active) {
                setRatings(prev => prev.map(r => {
                  const key = `${r.userId}_${r.movieId}`;
                  if (titleMap.has(key)) {
                    return { ...r, movieTitle: titleMap.get(key) };
                  }
                  return r;
                }));
              }
            });
          }).catch(e => console.warn('Failed to dynamically import tmdbService in useAdminData.ts:', e));
        }
      },
      handleError
    );

    return () => {
      active = false;
      unsubQueries();
      unsubCurations();
      unsubUsers();
      unsubRatings();
    };
  }, [user]);

  return {
    users,
    ratings,
    queries,
    curations,
    isDataLoading,
    error,
    // Expose setters for optimistic UI updates in the component
    setUsers,
    setRatings,
    setQueries,
    setCurations,
    setError,
    setIsDataLoading
  };
}
