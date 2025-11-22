
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ForumService } from '../../services/forum.service';
import { AuthService } from '../../services/auth.service';
import { ForumPost } from '../../shared/models/forum.model';
import { CreatePostModalComponent } from '../../components/create-post-modal/create-post-modal.component';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, CreatePostModalComponent, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './community.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityComponent {
  forumService = inject(ForumService);
  authService = inject(AuthService);
  translationService = inject(TranslationService);

  currentUser = this.authService.currentUser;
  posts = this.forumService.posts;
  
  readonly fixedCategories = ['General', 'Updates', 'Recommendations', 'Discussion'];

  // State
  activeCategory = signal('All');
  showMyPosts = signal(false);
  sortBy = signal('newest');
  showCreateModal = signal(false);
  postToEdit = signal<ForumPost | null>(null);

  isAdminOrMod = computed(() => {
    const user = this.currentUser();
    return !!user && (user.role === 'admin' || user.role === 'mod');
  });

  categories = computed(() => {
    const allPosts = this.posts();
    const categoryCounts = allPosts.reduce((acc, post) => {
      if (this.fixedCategories.includes(post.category)) {
        acc[post.category] = (acc[post.category] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });

    return this.fixedCategories.map(name => ({
      name,
      count: categoryCounts[name] || 0
    }));
  });

  categoryNames = computed(() => this.fixedCategories);

  filteredPosts = computed(() => {
    let posts = [...this.posts()];
    const category = this.activeCategory();
    const user = this.currentUser();

    // Filter
    if (this.showMyPosts() && user) {
        posts = posts.filter(p => p.authorId === user.id);
    } else if (category !== 'All') {
      posts = posts.filter(p => p.category === category);
    }

    // Sort
    posts.sort((a, b) => {
      if (this.sortBy() === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (this.sortBy() === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (this.sortBy() === 'top') {
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      }
      return 0;
    });

    // Pinned posts always on top
    return posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  });

  openCreateModal(): void {
    this.postToEdit.set(null);
    this.showCreateModal.set(true);
  }

  openEditModal(post: ForumPost): void {
    this.postToEdit.set(post);
    this.showCreateModal.set(true);
  }

  handleSavePost(postData: { title: string; content: string; category: string }): void {
    const postToUpdate = this.postToEdit();
    const user = this.currentUser();
    if (postToUpdate) {
      this.forumService.updatePost(postToUpdate.id, postData);
    } else if (user) {
      this.forumService.addPost(postData, user);
    }
    this.showCreateModal.set(false);
    this.postToEdit.set(null);
  }

  handleDeletePost(postId: number): void {
    if (confirm(this.translationService.translate('alertConfirmDeletePost'))) {
      this.forumService.deletePost(postId);
    }
  }

  handlePinPost(postId: number): void {
    this.forumService.togglePin(postId);
  }

  handleVote(postId: number, voteType: 'up' | 'down'): void {
    const user = this.currentUser();
    if (!user) {
      alert(this.translationService.translate('alertMustBeLoggedInToVote'));
      return;
    }
    this.forumService.vote(postId, user.id, voteType);
  }

  hasVoted(post: ForumPost, voteType: 'up' | 'down'): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    if (voteType === 'up') {
      return post.upvotedBy?.includes(user.id) ?? false;
    }
    return post.downvotedBy?.includes(user.id) ?? false;
  }

  selectCategory(category: string): void {
    this.showMyPosts.set(false);
    this.activeCategory.set(category);
  }

  toggleMyPosts(): void {
    this.activeCategory.set('All');
    this.showMyPosts.update(v => !v);
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
