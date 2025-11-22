import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { Media } from '../../shared/models/movie.model';
import { ForumService } from '../../services/forum.service';
import { ForumComment, ForumPost } from '../../shared/models/forum.model';
import { MediaCardComponent } from '../../components/media-card/media-card.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { WatchedItem } from '../../shared/models/user.model';

type ActivityItem =
  | { type: 'media-comment'; mediaTitle: string; mediaId: number; text: string; timestamp: Date }
  | { type: 'forum-post'; postTitle: string; postId: number; timestamp: Date }
  | { type: 'forum-comment'; postTitle: string; postId: number; text: string; timestamp: Date };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaCardComponent, TitleCasePipe, TranslatePipe],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  // FIX: Explicitly type the injected ActivatedRoute to resolve compilation error.
  private route: ActivatedRoute = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private movieService = inject(MovieService);
  private forumService = inject(ForumService);
  private translationService = inject(TranslationService);
  private router = inject(Router);

  private userId = toSignal(
    this.route.params.pipe(map(params => +params['id']))
  );
  
  user = computed(() => {
    const id = this.userId();
    // FIX: Cast `id` to number as `getUserById` expects a number and `userId()` may be inferred as unknown.
    return id ? this.authService.getUserById(id as number) : undefined;
  });

  recentlyWatchedMedia = computed(() => {
    const profileUser = this.user();
    if (!profileUser || !profileUser.recentlyWatched || profileUser.recentlyWatched.length === 0) {
      return [];
    }
    
    const allMedia = this.movieService.media();

    const latestWatchedByMediaId = new Map<number, WatchedItem>();
    [...profileUser.recentlyWatched]
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      .forEach(item => {
        if (!latestWatchedByMediaId.has(item.mediaId)) {
          latestWatchedByMediaId.set(item.mediaId, item);
        }
      });
      
    const result = Array.from(latestWatchedByMediaId.values())
      .map(watchedItem => ({
        media: allMedia.find(m => m.id === watchedItem.mediaId),
        watchedItem: watchedItem,
      }))
      .filter((item): item is { media: Media; watchedItem: WatchedItem } => !!item.media);

    return result.sort((a, b) => new Date(b.watchedItem.watchedAt).getTime() - new Date(a.watchedItem.watchedAt).getTime());
  });
  
  userActivity = computed<ActivityItem[]>(() => {
    const profileUser = this.user();
    if (!profileUser) {
      return [];
    }

    // 1. Media Comments
    const mediaComments = this.movieService.media().flatMap(media =>
      media.comments
        .filter(comment => comment.username === profileUser.username)
        .map(comment => ({
          type: 'media-comment' as const,
          mediaTitle: media.title,
          mediaId: media.id,
          text: comment.text,
          timestamp: new Date(comment.timestamp)
        }))
    );

    // 2. Forum Posts
    const forumPosts = this.forumService.posts()
      .filter(post => post.authorId === profileUser.id)
      .map(post => ({
        type: 'forum-post' as const,
        postTitle: post.title,
        postId: post.id,
        timestamp: new Date(post.createdAt)
      }));

    // 3. Forum Comments & Replies
    const forumComments: ActivityItem[] = [];
    const findUserComments = (comments: ForumComment[], post: ForumPost) => {
      for (const comment of comments) {
        if (comment.authorId === profileUser.id) {
          forumComments.push({
            type: 'forum-comment' as const,
            postTitle: post.title,
            postId: post.id,
            text: comment.text,
            timestamp: new Date(comment.createdAt)
          });
        }
        if (comment.replies?.length > 0) {
          findUserComments(comment.replies, post);
        }
      }
    };
    this.forumService.posts().forEach(post => findUserComments(post.comments, post));

    const allActivities = [...mediaComments, ...forumPosts, ...forumComments];

    // Sort all activities by date
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  getRoleClass(role: 'user' | 'mod' | 'admin'): string {
    switch (role) {
      case 'admin': return 'bg-primary text-white';
      case 'mod': return 'bg-blue-600 text-white';
      default: return 'bg-surface-light text-text-primary';
    }
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
