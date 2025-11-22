
import { Component, ChangeDetectionStrategy, EventEmitter, Output, input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Media, Episode, Comment } from '../../shared/models/movie.model';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-movie-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './movie-details-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieDetailsModalComponent {
  media = input.required<Media>();
  @Output() closeModal = new EventEmitter<void>();

  authService = inject(AuthService);
  movieService = inject(MovieService);
  translationService = inject(TranslationService);
  
  newComment = signal('');
  selectedSeasonIndex = signal(0);
  
  // Comment moderation signals
  editingCommentTimestamp = signal<Date | null>(null);
  editingCommentText = signal('');

  isAdminOrMod = computed(() => {
    const user = this.authService.currentUser();
    return !!user && (user.role === 'admin' || user.role === 'mod');
  });
  
  addComment() {
    const user = this.authService.currentUser();
    if (user && this.newComment().trim()) {
      this.movieService.addComment(this.media().id, user.username, this.newComment().trim());
      this.newComment.set('');
    }
  }

  deleteComment(timestamp: Date) {
    if (confirm(this.translationService.translate('confirmDeleteComment'))) {
      this.movieService.deleteComment(this.media().id, timestamp);
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
      if (timestamp) {
          this.movieService.editComment(this.media().id, timestamp, this.editingCommentText());
          this.cancelEdit();
      }
  }

  close() {
    this.closeModal.emit();
  }
}