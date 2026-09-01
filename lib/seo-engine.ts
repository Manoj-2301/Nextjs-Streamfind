import { Movie } from '@/types';

export const generateSemanticTitle = (movie: Movie): string => {
  const typeLabel = movie.type === 'tv' ? 'TV Show' : 'Movie';
  
  if (movie.platforms && movie.platforms.length > 0) {
    const primaryProvider = movie.platforms[0].name;
    return `Watch ${movie.title} ${movie.year ? `(${movie.year})` : ''} Streaming Online on ${primaryProvider} - StreamFind`;
  }
  
  return `Where to Watch & Stream ${movie.title} ${movie.year ? `(${movie.year})` : ''} Online - StreamFind`;
};

export const generateSemanticDescription = (movie: Movie): string => {
  const typeStr = movie.type === 'tv' ? 'TV show' : 'movie';
  const leadActor = movie.cast && movie.cast.length > 0 ? movie.cast[0].name : '';
  
  let description = `Looking for where to stream ${movie.title}? `;
  if (leadActor) {
    description += `Starring ${leadActor}, `;
  }
  
  if (movie.platforms && movie.platforms.length > 0) {
    const providers = movie.platforms.slice(0, 3).map(p => p.name).join(', ');
    description += `find out if it's available on ${providers} or other services. `;
  } else {
    description += `find out where you can watch this ${typeStr} online. `;
  }
  
  const summary = movie.description ? `${movie.description.substring(0, 80)}...` : '';
  description += summary;
  
  return description.trim();
};

export const generateFaqSchema = (movie: Movie) => {
  const mainEntity = [];

  // Question 1: Is it streaming on X?
  if (movie.platforms && movie.platforms.length > 0) {
    const providers = movie.platforms.map(p => p.name).join(' and ');
    mainEntity.push({
      '@type': 'Question',
      name: `Where can I watch or stream ${movie.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `You can currently stream ${movie.title} on ${providers}. Check StreamFind for direct streaming links.`,
      },
    });
  } else {
    mainEntity.push({
      '@type': 'Question',
      name: `Where can I watch or stream ${movie.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Currently, there are no verified streaming providers for ${movie.title}. Keep checking StreamFind for updates.`,
      },
    });
  }

  // Question 2: Cast
  if (movie.cast && movie.cast.length > 0) {
    const castMembers = movie.cast.slice(0, 3).map(c => c.name).join(', ');
    mainEntity.push({
      '@type': 'Question',
      name: `Who stars in ${movie.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `The main cast of ${movie.title} includes ${castMembers}.`,
      },
    });
  }

  // Question 3: Runtime/Seasons
  if (movie.runtime && movie.runtime !== 'N/A') {
    const runtimeQuestion = movie.type === 'tv' ? `How many seasons/episodes is ${movie.title}?` : `What is the runtime of ${movie.title}?`;
    mainEntity.push({
      '@type': 'Question',
      name: runtimeQuestion,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${movie.title} has a runtime of ${movie.runtime}.`,
      },
    });
  }

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
};
