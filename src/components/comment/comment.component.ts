

import { Component, ChangeDetectionStrategy, EventEmitter, Output, input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumComment } from '../../shared/models/forum.model';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-comment',
  standalone: true,
  imports: [CommonModule, FormsModule, CommentComponent, TranslatePipe],
  templateUrl: './comment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentComponent {
  comment = input.required<ForumComment>();
  postId = input.required<number>();
  
  @Output() reply = new EventEmitter<{ parentCommentId: number, text: string }>();
  @Output() vote = new EventEmitter<{ commentId: number, voteType: 'like' | 'dislike' }>();
  @Output() edit = new EventEmitter<{ commentId: number, text: string }>();
  @Output() delete = new EventEmitter<{ commentId: number }>();
  
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  currentUser = this.authService.currentUser;

  isReplying = signal(false);
  replyText = signal('');

  isEditing = signal(false);
  editText = signal('');

  canModify = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'mod') return true;
    return this.comment().authorId === user.id;
  });

  hasVoted(voteType: 'like' | 'dislike'): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (voteType === 'like') {
      return this.comment().likedBy.includes(user.id);
    }
    return this.comment().dislikedBy.includes(user.id);
  }

  toggleReply(): void {
    this.isReplying.update(v => !v);
    this.replyText.set('');
  }

  submitReply(): void {
    if (this.replyText().trim()) {
      this.reply.emit({ parentCommentId: this.comment().id, text: this.replyText() });
      this.isReplying.set(false);
      this.replyText.set('');
    }
  }
  
  submitVote(voteType: 'like' | 'dislike'): void {
    if (!this.currentUser()) {
      alert(this.translationService.translate('alertMustBeLoggedInToVote'));
      return;
    }
    this.vote.emit({ commentId: this.comment().id, voteType });
  }

  startEdit(): void {
    this.editText.set(this.comment().text);
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editText.set('');
  }

  saveEdit(): void {
    if (this.editText().trim()) {
      this.edit.emit({ commentId: this.comment().id, text: this.editText() });
      this.isEditing.set(false);
    }
  }

  submitDelete(): void {
    if (confirm(this.translationService.translate('confirmDeleteComment'))) {
      this.delete.emit({ commentId: this.comment().id });
    }
  }

  // Propagate events from child comments up to the top-level component
  propagateReply(event: { parentCommentId: number, text: string }): void {
    this.reply.emit(event);
  }

  propagateVote(event: { commentId: number, voteType: 'like' | 'dislike' }): void {
    this.vote.emit(event);
  }

  propagateEdit(event: { commentId: number, text: string }): void {
    this.edit.emit(event);
  }

  propagateDelete(event: { commentId: number }): void {
    this.delete.emit(event);
  }

  timeSince(date: Date | string): string {
    const t = this.translationService;
    const pastDate = new Date(date);
    const seconds = Math.floor((new Date().getTime() - pastDate.getTime()) / 1000);

    if (seconds < 60) return t.translate('timeJustNow');

    let interval = seconds / 31536000;
    if (interval > 1) {
        const value = Math.floor(interval);
        return `${value} ${t.translate(value === 1 ? 'timeYearAgo' : 'timeYearsAgo')}`;
    }

    interval = seconds / 2592000;
    if (interval > 1) {
        const value = Math.floor(interval);
        return `${value} ${t.translate(value === 1 ? 'timeMonthAgo' : 'timeMonthsAgo')}`;
    }
    
    interval = seconds / 86400;
    if (interval > 1) {
        const value = Math.floor(interval);
        return `${value} ${t.translate(value === 1 ? 'timeDayAgo' : 'timeDaysAgo')}`;
    }

    interval = seconds / 3600;
    if (interval > 1) {
        const value = Math.floor(interval);
        return `${value} ${t.translate(value === 1 ? 'timeHourAgo' : 'timeHoursAgo')}`;
    }
    
    interval = seconds / 60;
    if (interval > 1) {
        const value = Math.floor(interval);
        return `${value} ${t.translate(value === 1 ? 'timeMinuteAgo' : 'timeMinutesAgo')}`;
    }
    
    return t.translate('timeJustNow');
  }
}