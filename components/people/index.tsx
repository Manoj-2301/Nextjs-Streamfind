'use client';

import { useState } from 'react';
import { usePopularPeople } from '@/hooks/useTmdbQueries';
import PersonCard from '@/components/ui/person-card';
import Pagination from '@/components/ui/pagination';
import { Loader2 } from 'lucide-react';
import { Person } from '@/types';

export default function PeopleView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = usePopularPeople(page);

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 md:px-12 container mx-auto max-w-7xl">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-md">
          PEOPLE
        </h1>
        <p className="text-white/60 font-medium max-w-2xl">
          Discover the actors, directors, and crew members in the entertainment industry right now.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-brand" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {data?.results?.map((person, index) => (
              <PersonCard key={`${person.id}-${index}`} person={person} index={index % 20} />
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <div className="mt-16 mb-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={data.totalPages > 500 ? 500 : data.totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
