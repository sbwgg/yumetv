


import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { Media } from '../../shared/models/movie.model';
import { Router } from '@angular/router';
import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WatchedItem } from '../../shared/models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaCardComponent, TranslatePipe],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  movieService = inject(MovieService);
  authService = inject(AuthService);
  router = inject(Router);

  currentUser = this.authService.currentUser;

  genres = this.movieService.getGenres();
  audioLanguages = this.movieService.getAudioLanguages();
  subtitleLanguages = this.movieService.getSubtitleLanguages();

  searchTerm = signal('');
  selectedGenre = signal('');
  selectedYear = signal<number | null>(null);
  selectedAudioLang = signal('');
  selectedSubtitleLang = signal('');
  selectedType = signal(''); // 'Movie', 'TV Show', or '' for all

  filteredMedia = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const genre = this.selectedGenre();
    const year = this.selectedYear();
    const audioLang = this.selectedAudioLang();
    const subtitleLang = this.selectedSubtitleLang();
    const type = this.selectedType();

    return this.movieService.media().filter(media => {
      const titleMatch = media.title.toLowerCase().includes(term);
      const genreMatch = genre ? media.genre.includes(genre) : true;
      const yearMatch = year ? media.releaseYear === year : true;
      const audioMatch = audioLang ? media.audioLanguages.includes(audioLang) : true;
      const subtitleMatch = subtitleLang ? media.subtitleLanguages.includes(subtitleLang) : true;
      const typeMatch = type ? media.type === type : true;
      
      return titleMatch && genreMatch && yearMatch && audioMatch && subtitleMatch && typeMatch;
    });
  });
  
  years = computed(() => {
    const allYears = this.movieService.media().map(m => m.releaseYear);
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  });

  recentlyWatchedMedia = computed(() => {
    const user = this.currentUser();
    if (!user || !user.recentlyWatched || user.recentlyWatched.length === 0) {
      return [];
    }

    const allMedia = this.movieService.media();
    
    // Get the most recent watch entry for each unique media ID
    const latestWatchedByMediaId = new Map<number, WatchedItem>();
    [...user.recentlyWatched]
      // FIX: Wrap watchedAt in new Date() to handle both Date objects and date strings from localStorage.
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      .forEach(item => {
        if (!latestWatchedByMediaId.has(item.mediaId)) {
          latestWatchedByMediaId.set(item.mediaId, item);
        }
      });

    // Map these latest items back to an array of { media, watchedItem }
    const result = Array.from(latestWatchedByMediaId.values())
      .map(watchedItem => ({
        media: allMedia.find(m => m.id === watchedItem.mediaId),
        watchedItem: watchedItem,
      }))
      .filter((item): item is { media: Media; watchedItem: WatchedItem } => !!item.media);

    // Sort the final list by date to maintain the carousel order
    return result.sort((a, b) => new Date(b.watchedItem.watchedAt).getTime() - new Date(a.watchedItem.watchedAt).getTime());
  });
}