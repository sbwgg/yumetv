export interface Comment {
  username: string;
  text: string;
  timestamp: Date;
}

export interface Episode {
  episodeNumber: number;
  title: string;
  sourceUrl: string;
  thumbnailUrl: string;
}

export interface Season {
  seasonNumber: number;
  episodes: Episode[];
}

export interface Rating {
  userId: number;
  rating: number; // e.g., 1-5
}

export interface Media {
  id: number;
  title: string;
  description: string;
  posterUrl: string;
  thumbnailUrl?: string; // For landscape thumbs, different from portrait poster
  releaseYear: number;
  genre: string[];
  type: 'Movie' | 'TV Show';
  audioLanguages: string[];
  subtitleLanguages: string[];
  comments: Comment[];
  isProtected: boolean; // Simulates Widevine protection
  licenseServerUrl?: string; // For DRM
  ageRating: string; // e.g., 'G', 'PG-13', 'R'
  sourceUrl?: string; // For movies
  seasons?: Season[]; // For TV shows
  tags?: string[]; // e.g., 'New', 'HBO', '4K'
  ratings?: Rating[];
}