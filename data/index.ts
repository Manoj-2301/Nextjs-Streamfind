import { Movie } from '@/types';

export const DUMMY_MOVIES: Movie[] = [
  {
    id: 1,
    title: "Interstellar",
    year: 2014,
    genre: ["Sci-Fi", "Drama", "Adventure"],
    rating: 8.7,
    runtime: "2h 49m",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. When humanity is on the brink of extinction, a group of astronauts undertakes a dangerous mission to find a new home among the stars.",
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1000",
    backdropUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=2000",
    platforms: [
      { name: "Amazon Prime", logo: "📦", watchUrl: "https://primevideo.com", isSponsored: false },
      { name: "Hotstar", logo: "🌟", watchUrl: "https://hotstar.com", isSponsored: true }
    ],
    cast: [
      { name: "Matthew McConaughey", role: "Cooper", imageUrl: "https://i.pravatar.cc/150?u=matthew" },
      { name: "Anne Hathaway", role: "Brand", imageUrl: "https://i.pravatar.cc/150?u=anne" },
      { name: "Jessica Chastain", role: "Murph", imageUrl: "https://i.pravatar.cc/150?u=jessica" }
    ],
    trailerYoutubeId: "zSWdZVtXT7E"
  },
  {
    id: 2,
    title: "The Dark Knight",
    year: 2008,
    genre: ["Action", "Crime", "Drama"],
    rating: 9.0,
    runtime: "2h 32m",
    tagline: "Welcome to a world without rules.",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1000",
    backdropUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=2000",
    platforms: [
      { name: "HBO Max", logo: "🎬", watchUrl: "https://hbomax.com", isSponsored: false },
      { name: "Netflix", logo: "📺", watchUrl: "https://netflix.com", isSponsored: false }
    ],
    cast: [
      { name: "Christian Bale", role: "Bruce Wayne", imageUrl: "https://i.pravatar.cc/150?u=christian" },
      { name: "Heath Ledger", role: "Joker", imageUrl: "https://i.pravatar.cc/150?u=heath" },
      { name: "Gary Oldman", role: "James Gordon", imageUrl: "https://i.pravatar.cc/150?u=gary" }
    ],
    trailerYoutubeId: "EXeTwQWaywY"
  },
  {
    id: 3,
    title: "Inception",
    year: 2010,
    genre: ["Action", "Sci-Fi", "Adventure"],
    rating: 8.8,
    runtime: "2h 28m",
    tagline: "Your mind is the scene of the crime.",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    posterUrl: "https://images.unsplash.com/photo-1542204172-55af30e0143a?auto=format&fit=crop&q=80&w=1000",
    backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=2000",
    platforms: [
      { name: "Netflix", logo: "📺", watchUrl: "https://netflix.com", isSponsored: true },
      { name: "Apple TV", logo: "🍎", watchUrl: "https://apple.com/tv", isSponsored: false }
    ],
    cast: [
      { name: "Leonardo DiCaprio", role: "Cobb", imageUrl: "https://i.pravatar.cc/150?u=leo" },
      { name: "Joseph Gordon-Levitt", role: "Arthur", imageUrl: "https://i.pravatar.cc/150?u=joseph" },
      { name: "Elliot Page", role: "Ariadne", imageUrl: "https://i.pravatar.cc/150?u=elliot" }
    ],
    trailerYoutubeId: "YoHD9XEInc0"
  },
  {
    id: 4,
    title: "Dune: Part Two",
    year: 2024,
    genre: ["Action", "Adventure", "Sci-Fi"],
    rating: 8.9,
    runtime: "2h 46m",
    tagline: "Long live the fighters.",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1000",
    backdropUrl: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&q=80&w=2000",
    platforms: [
      { name: "Cinemas", logo: "🎞️", watchUrl: "https://fandango.com", isSponsored: false },
      { name: "HBO Max", logo: "🎬", watchUrl: "https://hbomax.com", isSponsored: true }
    ],
    cast: [
      { name: "Timothée Chalamet", role: "Paul Atreides", imageUrl: "https://i.pravatar.cc/150?u=tim" },
      { name: "Zendaya", role: "Chani", imageUrl: "https://i.pravatar.cc/150?u=zendaya" },
      { name: "Rebecca Ferguson", role: "Lady Jessica", imageUrl: "https://i.pravatar.cc/150?u=rebecca" }
    ],
    trailerYoutubeId: "Way9Dexny3w"
  },
  {
    id: 5,
    title: "Oppenheimer",
    year: 2023,
    genre: ["Biography", "Drama", "History"],
    rating: 8.4,
    runtime: "3h 0m",
    tagline: "The world forever changes.",
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    posterUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1000",
    backdropUrl: "https://images.unsplash.com/photo-1443632864897-14973fa006cf?auto=format&fit=crop&q=80&w=2000",
    platforms: [
      { name: "Peacock", logo: "🦚", watchUrl: "https://peacocktv.com", isSponsored: true },
      { name: "Rent/Buy", logo: "💳", watchUrl: "https://amazon.com", isSponsored: false }
    ],
    cast: [
      { name: "Cillian Murphy", role: "J. Robert Oppenheimer", imageUrl: "https://i.pravatar.cc/150?u=cillian" },
      { name: "Emily Blunt", role: "Kitty Oppenheimer", imageUrl: "https://i.pravatar.cc/150?u=emily" },
      { name: "Robert Downey Jr.", role: "Lewis Strauss", imageUrl: "https://i.pravatar.cc/150?u=rdj" }
    ],
    trailerYoutubeId: "uYPbbksJxIg"
  },
  {
    id: 6,
    title: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    genre: ["Animation", "Action", "Adventure"],
    rating: 8.6,
    runtime: "2h 20m",
    tagline: "It's how you wear the mask that matters.",
    description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.",
    posterUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&q=80&w=1000",
    backdropUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=2000",
    platforms: [
      { name: "Netflix", logo: "📺", watchUrl: "https://netflix.com", isSponsored: false },
      { name: "Sony Pictures", logo: "🎬", watchUrl: "https://sonypictures.com", isSponsored: false }
    ],
    cast: [
      { name: "Shameik Moore", role: "Miles Morales", imageUrl: "https://i.pravatar.cc/150?u=shameik" },
      { name: "Hailee Steinfeld", role: "Gwen Stacy", imageUrl: "https://i.pravatar.cc/150?u=hailee" },
      { name: "Oscar Isaac", role: "Miguel O'Hara", imageUrl: "https://i.pravatar.cc/150?u=oscar" }
    ],
    trailerYoutubeId: "shW9i6k8cB0"
  }
];
