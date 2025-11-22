export interface WatchedItem {
  mediaId: number;
  watchedAt: Date;
  progress: number; // in seconds
  duration: number; // in seconds
  // For TV shows
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'mod' | 'admin';
  recentlyWatched: WatchedItem[];
  profilePictureUrl?: string;
}

export interface PendingUser extends Omit<User, 'id' | 'role' | 'recentlyWatched'> {
  verificationToken: string;
  tokenExpires: Date;
}