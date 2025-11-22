import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Media } from '../../shared/models/movie.model';
import { RouterLink } from '@angular/router';
import { WatchedItem } from '../../shared/models/user.model';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './media-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardComponent {
  media = input.required<Media>();
  watchedItem = input<WatchedItem | undefined>();

  progressPercent = computed(() => {
    const item = this.watchedItem();
    if (!item || !item.duration) {
      return 0;
    }
    return (item.progress / item.duration) * 100;
  });

  watchedEpisodeInfo = computed(() => {
    const item = this.watchedItem();
    if (!item || item.seasonNumber === undefined || item.episodeNumber === undefined) {
      return null;
    }
    const season = item.seasonNumber.toString().padStart(2, '0');
    const episode = item.episodeNumber.toString().padStart(2, '0');
    return `S${season} E${episode}`;
  });

  averageRating = computed(() => {
    const ratings = this.media().ratings;
    if (!ratings || ratings.length === 0) {
      return 0;
    }
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const average = sum / ratings.length;
    return Math.round(average * 10) / 10; // Round to one decimal place
  });

  private languageToCountryCode: { [key: string]: string } = {
    'English': 'gb',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Japanese': 'jp',
    'Korean': 'kr',
    'Mandarin': 'cn',
    'Cantonese': 'hk',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Russian': 'ru',
    'Hindi': 'in',
    'Arabic': 'sa',
  };

  getCountryCode(language: string): string | null {
    return this.languageToCountryCode[language] || null;
  }
}
