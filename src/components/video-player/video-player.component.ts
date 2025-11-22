import { Component, ChangeDetectionStrategy, input, signal, ViewChild, ElementRef, AfterViewInit, OnInit, inject, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Media, Episode } from '../../shared/models/movie.model';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

declare var shaka: any;

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  media = input.required<Media>();
  sourceUrl = input.required<string>();
  seasonNumber = input<number | undefined>();
  episodeNumber = input<number | undefined>();

  private elementRef = inject(ElementRef);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  // FIX: Explicitly type the injected Router to resolve compilation error.
  private router: Router = inject(Router);
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  // Player state signals
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  volume = signal(1);
  isMuted = signal(false);
  
  // UI state signals
  showSettings = signal(false);
  controlsVisible = signal(true);
  showEpisodesMenu = signal(false);
  selectedSeasonForMenu = signal(1);
  showNextEpisodeOverlay = signal(false);
  nextEpisodeCountdown = signal<number | null>(null);
  
  // Shaka player signals
  audioTracks = signal<{ name: string; lang: string }[]>([]);
  subtitleTracks = signal<{ name: string; lang: string }[]>([]);
  selectedAudioLang = signal<string>('');
  selectedSubtitleLang = signal<string>('off');

  private controlsTimeout: any;
  private nextEpisodeTimeout: any;
  private countdownInterval: any;
  private progressSaveInterval: any;
  private videoEl!: HTMLVideoElement;
  private player: any;

  nextEpisode = computed(() => {
    const media = this.media();
    const currentSeasonNum = this.seasonNumber();
    const currentEpisodeNum = this.episodeNumber();

    if (media.type !== 'TV Show' || !media.seasons || currentSeasonNum === undefined || currentEpisodeNum === undefined) {
      return null;
    }

    const currentSeasonIndex = media.seasons.findIndex(s => s.seasonNumber === currentSeasonNum);
    if (currentSeasonIndex === -1) return null;
    const currentSeason = media.seasons[currentSeasonIndex];
    
    const currentEpisodeIndex = currentSeason.episodes.findIndex(e => e.episodeNumber === currentEpisodeNum);
    if (currentEpisodeIndex === -1) return null;
    
    // Check for next episode in the same season
    if (currentEpisodeIndex < currentSeason.episodes.length - 1) {
      const nextEp = currentSeason.episodes[currentEpisodeIndex + 1];
      return { season: currentSeasonNum, episode: nextEp.episodeNumber, details: nextEp };
    }
    
    // Check for first episode in the next season
    if (currentSeasonIndex < media.seasons.length - 1) {
      const nextSeason = media.seasons[currentSeasonIndex + 1];
      if (nextSeason.episodes.length > 0) {
        const nextEp = nextSeason.episodes[0];
        return { season: nextSeason.seasonNumber, episode: nextEp.episodeNumber, details: nextEp };
      }
    }
    
    return null; // No next episode
  });

  selectedSeasonDetails = computed(() => {
    const media = this.media();
    const selectedSeasonNum = this.selectedSeasonForMenu();
    if (!media.seasons) {
      return undefined;
    }
    return media.seasons.find(s => s.seasonNumber === selectedSeasonNum);
  });

  ngOnInit(): void {
    this.selectedSeasonForMenu.set(this.seasonNumber() || (this.media().seasons?.[0]?.seasonNumber ?? 1));
  }

  ngAfterViewInit(): void {
    this.videoEl = this.videoPlayerRef.nativeElement;
    this.setupPlayer();
    this.addVideoEventListeners();
    this.progressSaveInterval = setInterval(() => this.saveProgress(), 15000); // Save every 15s
    
    if (this.settingsService.settings().player.autoPlay) {
      this.videoEl.play().catch(error => {
        console.error('Auto-play was prevented:', error);
        // User interaction is needed, so controls should be visible.
        this.controlsVisible.set(true);
      });
    }
    this.showControls();
  }
  
  ngOnDestroy(): void {
    this.saveProgress(); // Final save before destroying
    clearInterval(this.progressSaveInterval);
    this.player?.destroy();
    this.removeVideoEventListeners();
    clearTimeout(this.controlsTimeout);
    clearTimeout(this.nextEpisodeTimeout);
    clearInterval(this.countdownInterval);
  }
  
  private getLanguageName(langCode: string): string {
    try {
      const displayName = new Intl.DisplayNames(['en'], { type: 'language' });
      const name = displayName.of(langCode);
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : langCode;
    } catch (e) {
      return langCode;
    }
  }

  private async setupPlayer() {
    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      console.error('Browser not supported by Shaka Player!');
      return;
    }

    this.player = new shaka.Player(this.videoEl);
    this.player.addEventListener('error', (event: any) => console.error('Shaka Player Error:', event.detail));

    const media = this.media();
    if (media.isProtected && media.licenseServerUrl) {
      this.player.configure({
        drm: {
          servers: { 'com.widevine.alpha': media.licenseServerUrl }
        }
      });
    }
    
    try {
      await this.player.load(this.sourceUrl());
      
      const audioLangs = this.player.getAudioLanguages();
      this.audioTracks.set(audioLangs.map((lang: string) => ({ name: this.getLanguageName(lang), lang })));
      if (audioLangs.length > 0) {
        this.selectedAudioLang.set(audioLangs[0]);
      }
      
      const textLangs = this.player.getTextLanguages();
      this.subtitleTracks.set(textLangs.map((lang: string) => ({ name: this.getLanguageName(lang), lang })));
      this.player.setTextTrackVisibility(false); // Off by default

    } catch (e) {
      console.error('Error loading media with Shaka Player:', e);
    }
  }
  
  private loadProgress() {
    const savedProgress = this.authService.getWatchedProgress(
      this.media().id, 
      this.seasonNumber(), 
      this.episodeNumber()
    );

    if (savedProgress && savedProgress.progress > 0) {
      // Don't resume if progress is within the last 5%
      const percentWatched = (savedProgress.progress / savedProgress.duration) * 100;
      if (percentWatched < 95) {
        this.videoEl.currentTime = savedProgress.progress;
      }
    }
  }
  
  private saveProgress() {
    if (this.duration() > 0 && this.authService.currentUser()) {
      this.authService.trackMediaProgress({
        mediaId: this.media().id,
        progress: this.currentTime(),
        duration: this.duration(),
        seasonNumber: this.seasonNumber(),
        episodeNumber: this.episodeNumber()
      });
    }
  }

  private addVideoEventListeners() {
    this.videoEl.addEventListener('play', this.onPlay);
    this.videoEl.addEventListener('pause', this.onPause);
    this.videoEl.addEventListener('ended', this.onEnded);
    this.videoEl.addEventListener('timeupdate', this.onTimeUpdate);
    this.videoEl.addEventListener('loadedmetadata', this.onLoadedMetadata);
    this.videoEl.addEventListener('volumechange', this.onVolumeChange);
  }

  private removeVideoEventListeners() {
    if (this.videoEl) {
      this.videoEl.removeEventListener('play', this.onPlay);
      this.videoEl.removeEventListener('pause', this.onPause);
      this.videoEl.removeEventListener('ended', this.onEnded);
      this.videoEl.removeEventListener('timeupdate', this.onTimeUpdate);
      this.videoEl.removeEventListener('loadedmetadata', this.onLoadedMetadata);
      this.videoEl.removeEventListener('volumechange', this.onVolumeChange);
    }
  }

  private onPlay = () => this.isPlaying.set(true);
  private onPause = () => {
    this.isPlaying.set(false);
    this.saveProgress();
  };
  private onTimeUpdate = () => {
    this.currentTime.set(this.videoEl.currentTime);
    const timeLeft = this.duration() - this.currentTime();
    if (timeLeft > 0 && timeLeft <= 10 && this.nextEpisode() && !this.showNextEpisodeOverlay()) {
        if (this.settingsService.settings().player.autoNext) {
            this.showNextEpisodeOverlay.set(true);
            this.startNextEpisodeCountdown();
        }
    }
  };
  private onLoadedMetadata = () => {
    this.duration.set(this.videoEl.duration);
    this.loadProgress();
  };
  private onVolumeChange = () => {
    this.volume.set(this.videoEl.volume);
    this.isMuted.set(this.videoEl.muted);
  };
  private onEnded = () => {
    // Mark as fully watched by setting progress to duration
    if (this.duration() > 0) {
       this.authService.trackMediaProgress({
        mediaId: this.media().id,
        progress: this.duration(),
        duration: this.duration(),
        seasonNumber: this.seasonNumber(),
        episodeNumber: this.episodeNumber()
      });
    }
   
    const nextEp = this.nextEpisode();
    if (nextEp) {
        if (!this.settingsService.settings().player.autoNext) {
             this.showNextEpisodeOverlay.set(true);
        } else if (!this.showNextEpisodeOverlay()) {
             this.playNextEpisode();
        }
    }
  }
  
  goBack() {
    this.router.navigate(['/media', this.media().id]);
  }

  playNextEpisode() {
    const nextEp = this.nextEpisode();
    if (nextEp) {
      this.router.navigate(['/watch', 'tv', this.media().id, 's', nextEp.season, 'e', nextEp.episode]);
      this.resetNextEpisodeState();
    }
  }

  private startNextEpisodeCountdown() {
    this.nextEpisodeCountdown.set(10);
    this.countdownInterval = setInterval(() => {
      this.nextEpisodeCountdown.update(val => (val !== null && val > 1) ? val - 1 : 0);
    }, 1000);
    this.nextEpisodeTimeout = setTimeout(() => {
      this.playNextEpisode();
    }, 10000);
  }

  private resetNextEpisodeState() {
    this.showNextEpisodeOverlay.set(false);
    clearTimeout(this.nextEpisodeTimeout);
    clearInterval(this.countdownInterval);
    this.nextEpisodeCountdown.set(null);
  }
  
  cancelAutoPlayNext() {
    this.resetNextEpisodeState();
    this.controlsVisible.set(true); // show controls again
  }
  
  skip(seconds: number) {
    this.videoEl.currentTime = Math.max(0, Math.min(this.duration(), this.videoEl.currentTime + seconds));
  }

  togglePlayPause() {
    this.isPlaying() ? this.videoEl.pause() : this.videoEl.play();
  }

  handleProgressChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.videoEl.currentTime = +value;
  }

  handleVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.videoEl.volume = +value;
    if (+value > 0) {
      this.videoEl.muted = false;
    }
  }
  
  toggleMute() {
    this.videoEl.muted = !this.videoEl.muted;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
        this.elementRef.nativeElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
  }

  changeAudioTrack(lang: string) {
    if (this.player) {
      this.player.selectAudioLanguage(lang);
      this.selectedAudioLang.set(lang);
    }
  }

  changeSubtitleTrack(lang: string) {
    if (this.player) {
      if (lang === 'off') {
        this.player.setTextTrackVisibility(false);
      } else {
        this.player.selectTextLanguage(lang);
        this.player.setTextTrackVisibility(true);
      }
      this.selectedSubtitleLang.set(lang);
    }
  }

  showControls() {
    this.controlsVisible.set(true);
    clearTimeout(this.controlsTimeout);
    if (this.isPlaying()) {
      this.controlsTimeout = setTimeout(() => this.controlsVisible.set(false), 3000);
    }
  }

  keepControlsVisible() {
    clearTimeout(this.controlsTimeout);
  }

  hideControlsOnLeave() {
     if (this.isPlaying()) {
      this.controlsVisible.set(false);
    }
  }

  formatTime(timeInSeconds: number): string {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
      return '0:00';
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
