import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Media, Comment, Rating } from '../shared/models/movie.model';
import { DatabaseService } from './database.service';

const AVAILABLE_LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 
    'Mandarin', 'Cantonese', 'Italian', 'Portuguese', 'Russian', 'Hindi', 'Arabic'
].sort();

@Injectable({ providedIn: 'root' })
export class MovieService {
  private database = inject(DatabaseService);

  media = computed(() => this.database.state().media);

  getGenres(): string[] {
    // FIX: Replaced flatMap with map().flat() to resolve a TypeScript type inference issue.
    const allGenres = this.media().map((m: Media) => m.genre || []).flat();
    return [...new Set(allGenres)].sort();
  }

  getAudioLanguages(): string[] {
    // FIX: Replaced flatMap with map().flat() to resolve a TypeScript type inference issue.
    const allLanguages = this.media().map((m: Media) => m.audioLanguages || []).flat();
    return [...new Set(allLanguages)].sort();
  }
  
  getSubtitleLanguages(): string[] {
    // FIX: Replaced flatMap with map().flat() to resolve a TypeScript type inference issue.
    const allLanguages = this.media().map((m: Media) => m.subtitleLanguages || []).flat();
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
    this.database.state.update(state => ({ ...state, media: [...state.media, newMedia]}));
  }

  updateMedia(id: number, mediaData: Partial<Omit<Media, 'id' | 'comments' | 'ratings'>>) {
    this.database.state.update(state => ({
      ...state,
      media: state.media.map(m => m.id === id ? { ...m, ...mediaData } : m)
    }));
  }

  deleteMedia(id: number) {
    this.database.state.update(state => ({...state, media: state.media.filter(m => m.id !== id)}));
  }

  addComment(mediaId: number, username: string, text: string) {
    this.database.state.update(state => ({
      ...state,
      media: state.media.map(m => {
        if (m.id === mediaId) {
          const newComment: Comment = { username, text, timestamp: new Date() };
          return { ...m, comments: [newComment, ...(m.comments || [])] };
        }
        return m;
      })
    }));
  }

  editComment(mediaId: number, timestamp: Date, newText: string) {
    this.database.state.update(state => ({
      ...state,
      media: state.media.map(m => {
        if (m.id === mediaId) {
          return { 
            ...m, 
            comments: m.comments.map(c => 
              new Date(c.timestamp).getTime() === timestamp.getTime() ? { ...c, text: newText } : c
            ) 
          };
        }
        return m;
      })
    }));
  }

  deleteComment(mediaId: number, timestamp: Date) {
    this.database.state.update(state => ({
      ...state,
      media: state.media.map(m => {
        if (m.id === mediaId) {
          return { 
            ...m, 
            comments: m.comments.filter(c => new Date(c.timestamp).getTime() !== timestamp.getTime()) 
          };
        }
        return m;
      })
    }));
  }

  rateMedia(mediaId: number, userId: number, rating: number) {
    this.database.state.update(state => ({
      ...state,
      media: state.media.map(m => {
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
    }));
  }
}