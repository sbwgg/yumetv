import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { Router } from '@angular/router';
import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaCardComponent, TranslatePipe],
  templateUrl: './browse.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowseComponent {
  movieService = inject(MovieService);
  router = inject(Router);

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
    // FIX: Explicitly type 'a' and 'b' as numbers to ensure correct type for subtraction.
    return Array.from(new Set(allYears)).sort((a: number, b: number) => b - a);
  });
}