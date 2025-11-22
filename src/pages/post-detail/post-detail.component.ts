

import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ForumService } from '../../services/forum.service';
import { AuthService } from '../../services/auth.service';
import { ForumPost } from '../../shared/models/forum.model';
import { FormsModule } from '@angular/forms';
import { CommentComponent } from '../../components/comment/comment.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CreatePostModalComponent } from '../../components/create-post-modal/create-post-modal.component';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CommentComponent, TranslatePipe, CreatePostModalComponent],
  templateUrl: './post-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent {
  // FIX: Explicitly type the injected ActivatedRoute to resolve compilation error.
  private route: ActivatedRoute = inject(ActivatedRoute);
  // FIX: Explicitly type the injected Router to resolve compilation error.
  private router: Router = inject(Router);
  private forumService = inject(ForumService);
  private translationService = inject(TranslationService);
  authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  newCommentText = signal('');
  showEditModal = signal(false);

  private postId = toSignal(
    this.route.params.pipe(map(params => +params['id']))
  );

  post = computed(() => {
    const id = this.postId();
    if (!id) return undefined;
    return this.forumService.posts().find(p => p.id === id);
  });

  postToEdit = computed(() => this.post());

  categoryNames = computed(() => {
    return ['General', 'Updates', 'Recommendations', 'Discussion'];
  });

  isAdminOrMod = computed(() => {
    const user = this.currentUser();
    return !!user && (user.role === 'admin' || user.role === 'mod');
  });

  canModifyPost = computed(() => {
    const user = this.currentUser();
    const post = this.post();
    if (!user || !post) return false;
    if (user.role === 'admin' || user.role === 'mod') return true;
    return post.authorId === user.id;
  });

  handleVote(voteType: 'up' | 'down'): void {
    const user = this.currentUser();
    const currentPost = this.post();
    if (!user || !currentPost) {
      alert(this.translationService.translate('alertMustBeLoggedInToVote'));
      return;
    }
    this.forumService.vote(currentPost.id, user.id, voteType);
  }

  hasVoted(voteType: 'up' | 'down'): boolean {
    const user = this.currentUser();
    const currentPost = this.post();
    if (!user || !currentPost) return false;
    
    if (voteType === 'up') {
      return currentPost.upvotedBy?.includes(user.id) ?? false;
    }
    return currentPost.downvotedBy?.includes(user.id) ?? false;
  }
  
  addComment(): void {
    const user = this.currentUser();
    const currentPost = this.post();
    const text = this.newCommentText().trim();
    if (user && currentPost && text) {
      this.forumService.addComment(currentPost.id, user, text);
      this.newCommentText.set('');
    }
  }

  handleReply(event: { parentCommentId: number; text: string }): void {
     const user = this.currentUser();
     const currentPost = this.post();
     if (user && currentPost) {
       this.forumService.addReply(currentPost.id, event.parentCommentId, user, event.text);
     }
  }

  handleCommentVote(event: { commentId: number; voteType: 'like' | 'dislike' }): void {
    const user = this.currentUser();
    const currentPost = this.post();
    if (user && currentPost) {
      this.forumService.voteOnComment(currentPost.id, event.commentId, user.id, event.voteType);
    }
  }

  handleCommentEdit(event: { commentId: number; text: string }): void {
    const currentPost = this.post();
    if (currentPost) {
      this.forumService.editComment(currentPost.id, event.commentId, event.text);
    }
  }

  handleCommentDelete(event: { commentId: number }): void {
    const currentPost = this.post();
    if (currentPost) {
      this.forumService.deleteComment(currentPost.id, event.commentId);
    }
  }

  openEditModal(): void {
    this.showEditModal.set(true);
  }

  handleSavePost(postData: { title: string; content: string; category: string }): void {
    const postToUpdate = this.postToEdit();
    if (postToUpdate) {
      this.forumService.updatePost(postToUpdate.id, postData);
    }
    this.showEditModal.set(false);
  }

  handleDeletePost(): void {
    const postToDelete = this.post();
    if (postToDelete && confirm(this.translationService.translate('alertConfirmDeletePost'))) {
      this.forumService.deletePost(postToDelete.id);
      this.router.navigate(['/community']);
    }
  }

  getCategoryColor(category: string): string {
    const map: { [key: string]: string } = {
      'Updates': 'text-category-update',
      'General': 'text-category-general',
      'Recommendations': 'text-category-suggestion',
      'Discussion': 'text-category-discussion',
    };
    return map[category] || 'text-slate-400';
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
