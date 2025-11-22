import { Component, ChangeDetectionStrategy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MovieService } from '../../services/movie.service';
import { Media } from '../../shared/models/movie.model';
import { VideoPlayerComponent } from '../../components/video-player/video-player.component';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, VideoPlayerComponent],
  templateUrl: './player.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerComponent {
  // FIX: Explicitly type the injected ActivatedRoute to resolve compilation error.
  private route: ActivatedRoute = inject(ActivatedRoute);
  // FIX: Explicitly type the injected Router to resolve compilation error.
  private router: Router = inject(Router);
  private movieService = inject(MovieService);

  private params = toSignal(this.route.params);
  private url = toSignal(this.route.url.pipe(map(segments => segments.map(s => s.path).join('/'))));

  media = computed<Media | undefined>(() => {
    const mediaId = this.params()?.['id'];
    if (!mediaId) return undefined;
    return this.movieService.media().find(m => m.id === +mediaId);
  });

  seasonNumber = computed<number | undefined>(() => {
    const params = this.params();
    return params && params['season'] ? +params['season'] : undefined;
  });

  episodeNumber = computed<number | undefined>(() => {
    const params = this.params();
    return params && params['episode'] ? +params['episode'] : undefined;
  });

  sourceUrl = computed<string | null>(() => {
    const currentUrl = this.url();
    const currentParams = this.params();
    const currentMedia = this.media();

    if (!currentUrl || !currentParams || !currentMedia) return null;

    if (currentUrl.startsWith('watch/movie') && currentMedia.type === 'Movie') {
      return currentMedia.sourceUrl || null;
    }

    if (currentUrl.startsWith('watch/tv') && currentMedia.type === 'TV Show') {
      const seasonNum = this.seasonNumber();
      const episodeNum = this.episodeNumber();
      if (!seasonNum || !episodeNum) return null;
      
      const season = currentMedia.seasons?.find(s => s.seasonNumber === seasonNum);
      const episode = season?.episodes.find(e => e.episodeNumber === episodeNum);
      return episode?.sourceUrl || null;
    }
    
    return null;
  });

  constructor() {
    effect(() => {
      // This effect runs whenever the params change. If, after a route change,
      // the media or source URL can't be found, it redirects to the home page.
      const p = this.params();
      if (p && p['id']) { // Ensure we have params to evaluate
        if (!this.media() || !this.sourceUrl()) {
          // Use a timeout to avoid navigation conflicts during component rendering
          setTimeout(() => this.router.navigate(['/']), 0);
        }
      }
    });
  }
}
