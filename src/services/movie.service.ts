



import { Injectable, signal, effect, inject } from '@angular/core';
import { Media, Comment, Rating } from '../shared/models/movie.model';
import { StorageService } from './storage.service';

const MEDIA_STORAGE_KEY = 'yume_tv_media';
const AVAILABLE_LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 
    'Mandarin', 'Cantonese', 'Italian', 'Portuguese', 'Russian', 'Hindi', 'Arabic'
].sort();

@Injectable({ providedIn: 'root' })
export class MovieService {
  private mockMedia: Media[] = [];
  private storageService = inject(StorageService);

  media = signal<Media[]>([]);

  constructor() {
    const storedMedia = this.storageService.getItem(MEDIA_STORAGE_KEY);
    if (storedMedia) {
        const parsedMedia = JSON.parse(storedMedia, (key, value) => {
            if (key === 'timestamp' && typeof value === 'string') {
                return new Date(value);
            }
            return value;
        });
        // FIX: Cast the parsed data from localStorage to ensure the signal has the correct type,
        // which resolves downstream type inference errors.
        this.media.set(parsedMedia as Media[]);
    } else {
        this.media.set(this.mockMedia);
    }

    effect(() => {
        this.storageService.setItem(MEDIA_STORAGE_KEY, JSON.stringify(this.media()));
    });
  }

  getGenres(): string[] {
    // FIX: Use map().flat() to correctly flatten the array of genres. This avoids potential type inference issues with flatMap.
    const allGenres = this.media().map(m => m.genre || []).flat();
    return [...new Set(allGenres)].sort();
  }

  getAudioLanguages(): string[] {
    // FIX: Use map().flat() to correctly flatten the array of languages. This avoids potential type inference issues with flatMap.
    const allLanguages = this.media().map(m => m.audioLanguages || []).flat();
    return [...new Set(allLanguages)].sort();
  }
  
  getSubtitleLanguages(): string[] {
    // FIX: Use map().flat() to correctly flatten the array of languages. This avoids potential type inference issues with flatMap.
    const allLanguages = this.media().map(m => m.subtitleLanguages || []).flat();
    return [...new Set(allLanguages)].sort();
  }

  getAvailableLanguages(): string[] {
    return AVAILABLE_LANGUAGES;
  }

  addMedia(mediaData: Omit<Media, 'id' | 'comments'>) {
    const newMedia: Media = {
      id: Math.max(0, ...this.media().map(m => m.id)) + 1,
      ...mediaData,
      comments: []
    };
    this.media.update(media => [...media, newMedia]);
  }

  updateMedia(id: number, mediaData: Partial<Omit<Media, 'id' | 'comments' | 'ratings'>>) {
    this.media.update(media => 
      media.map(m => m.id === id ? { ...m, ...mediaData } : m)
    );
  }

  deleteMedia(id: number) {
    this.media.update(media => media.filter(m => m.id !== id));
  }

  addComment(mediaId: number, username: string, text: string) {
    this.media.update(media => media.map(m => {
      if (m.id === mediaId) {
        const newComment: Comment = { username, text, timestamp: new Date() };
        return { ...m, comments: [newComment, ...(m.comments || [])] };
      }
      return m;
    }));
  }

  editComment(mediaId: number, timestamp: Date, newText: string) {
    this.media.update(media => media.map(m => {
      if (m.id === mediaId) {
        return { 
          ...m, 
          comments: m.comments.map(c => 
            new Date(c.timestamp).getTime() === timestamp.getTime() ? { ...c, text: newText } : c
          ) 
        };
      }
      return m;
    }));
  }

  deleteComment(mediaId: number, timestamp: Date) {
    this.media.update(media => media.map(m => {
      if (m.id === mediaId) {
        return { 
          ...m, 
          comments: m.comments.filter(c => new Date(c.timestamp).getTime() !== timestamp.getTime()) 
        };
      }
      return m;
    }));
  }

  rateMedia(mediaId: number, userId: number, rating: number) {
    this.media.update(media =>
      media.map(m => {
        if (m.id === mediaId) {
          const newRatings = m.ratings ? [...m.ratings] : [];
          const userRatingIndex = newRatings.findIndex(r => r.userId === userId);

          if (userRatingIndex > -1) {
            // Update existing rating
            newRatings[userRatingIndex] = { userId, rating };
          } else {
            // Add new rating
            newRatings.push({ userId, rating });
          }
          return { ...m, ratings: newRatings };
        }
        return m;
      })
    );
  }
}
