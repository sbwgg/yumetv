



import { Injectable, signal, effect } from '@angular/core';
import { Media, Comment } from '../shared/models/movie.model';

const MEDIA_STORAGE_KEY = 'yume_tv_media';
const AVAILABLE_LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 
    'Mandarin', 'Cantonese', 'Italian', 'Portuguese', 'Russian', 'Hindi', 'Arabic'
].sort();

@Injectable({ providedIn: 'root' })
export class MovieService {
  private mockMedia: Media[] = [];

  media = signal<Media[]>([]);

  constructor() {
    const storedMedia = localStorage.getItem(MEDIA_STORAGE_KEY);
    if (storedMedia) {
        const parsedMedia = JSON.parse(storedMedia, (key, value) => {
            if (key === 'timestamp' && typeof value === 'string') {
                return new Date(value);
            }
            return value;
        });
        this.media.set(parsedMedia);
    } else {
        this.media.set(this.mockMedia);
    }

    effect(() => {
        localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(this.media()));
    });
  }

  getGenres(): string[] {
    // FIX: Explicitly type 'm' as Media and handle potentially undefined arrays to ensure correct type inference.
    const allGenres = this.media().flatMap((m: Media) => m.genre || []);
    return Array.from(new Set(allGenres)).sort();
  }

  getAudioLanguages(): string[] {
    // FIX: Explicitly type 'm' as Media and handle potentially undefined arrays to ensure correct type inference.
    const allLanguages = this.media().flatMap((m: Media) => m.audioLanguages || []);
    return Array.from(new Set(allLanguages)).sort();
  }
  
  getSubtitleLanguages(): string[] {
    // FIX: Explicitly type 'm' as Media and handle potentially undefined arrays to ensure correct type inference.
    const allLanguages = this.media().flatMap((m: Media) => m.subtitleLanguages || []);
    return Array.from(new Set(allLanguages)).sort();
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

  updateMedia(id: number, mediaData: Partial<Omit<Media, 'id' | 'comments'>>) {
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
}