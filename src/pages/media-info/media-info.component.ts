
import { Component, ChangeDetectionStrategy, EventEmitter, Output, input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Media, Comment } from '../../shared/models/movie.model';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-media-info',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './media-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaInfoComponent {
  // FIX: Explicitly type the injected ActivatedRoute to resolve compilation error.
  private route: ActivatedRoute = inject(ActivatedRoute);
  private movieService = inject(MovieService);
  authService = inject(AuthService);

  private mediaId = toSignal(
    this.route.params.pipe(map(params => +params['id']))
  );
  
  media = computed(() => {
    const id = this.mediaId();
    if (!id) return undefined;
    return this.movieService.media().find(m => m.id === id);
  });
  
  currentUser = this.authService.currentUser;

  watchHistory = computed(() => this.currentUser()?.recentlyWatched || []);
  
  movieProgress = computed(() => {
    const media = this.media();
    const history = this.watchHistory();
    if (media?.type !== 'Movie') return null;

    const progress = history.find(item => item.mediaId === media.id);
    if (!progress || progress.progress / progress.duration > 0.95) {
      return null; // Not started or finished
    }
    return progress;
  });

  lastWatchedTvEpisode = computed(() => {
    const media = this.media();
    const history = this.watchHistory();
    if (media?.type !== 'TV Show') return null;

    const lastWatched = history
      .filter(item => item.mediaId === media.id)
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      [0]; // Get the most recent one

    if (!lastWatched || lastWatched.progress / lastWatched.duration > 0.95) {
      return null; // Not started or finished
    }
    return lastWatched;
  });

  newComment = signal('');
  selectedSeasonIndex = signal(0);
  
  editingCommentTimestamp = signal<Date | null>(null);
  editingCommentText = signal('');

  isAdminOrMod = computed(() => {
    const user = this.authService.currentUser();
    return !!user && (user.role === 'admin' || user.role === 'mod');
  });
  
  addComment() {
    const user = this.authService.currentUser();
    const currentMedia = this.media();
    if (user && this.newComment().trim() && currentMedia) {
      this.movieService.addComment(currentMedia.id, user.username, this.newComment().trim());
      this.newComment.set('');
    }
  }

  deleteComment(timestamp: Date) {
     const currentMedia = this.media();
    if (currentMedia && confirm('Are you sure you want to delete this comment?')) {
      this.movieService.deleteComment(currentMedia.id, timestamp);
    }
  }

  startEditComment(comment: Comment) {
    this.editingCommentTimestamp.set(comment.timestamp);
    this.editingCommentText.set(comment.text);
  }

  cancelEdit() {
      this.editingCommentTimestamp.set(null);
      this.editingCommentText.set('');
  }

  saveCommentEdit() {
      const timestamp = this.editingCommentTimestamp();
      const currentMedia = this.media();
      if (timestamp && currentMedia) {
          this.movieService.editComment(currentMedia.id, timestamp, this.editingCommentText());
          this.cancelEdit();
      }
  }

  formatProgressTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
}
