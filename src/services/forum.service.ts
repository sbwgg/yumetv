import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { ForumPost, ForumComment } from '../shared/models/forum.model';
import { User } from '../shared/models/user.model';
import { DatabaseService } from './database.service';

@Injectable({ providedIn: 'root' })
export class ForumService {
  private database = inject(DatabaseService);
  posts = computed(() => this.database.state().posts);

  private getNextCommentId(): number {
    let maxId = 0;
    const findMax = (comments: ForumComment[]) => {
      for (const comment of comments) {
        if (comment.id > maxId) maxId = comment.id;
        if (comment.replies) findMax(comment.replies);
      }
    };
    this.posts().forEach(post => findMax(post.comments));
    return maxId + 1;
  }

  addPost(data: { title: string; content: string; category: string }, author: User): void {
    const newPost: ForumPost = {
      id: Math.max(0, ...this.posts().map(p => p.id)) + 1,
      title: data.title,
      content: data.content,
      category: data.category,
      authorId: author.id,
      authorUsername: author.username,
      authorProfilePictureUrl: author.profilePictureUrl,
      authorRole: author.role,
      createdAt: new Date(),
      isPinned: false,
      upvotes: 1,
      downvotes: 0,
      upvotedBy: [author.id],
      downvotedBy: [],
      comments: [],
    };
    this.database.state.update(state => ({ ...state, posts: [newPost, ...state.posts] }));
  }

  updatePost(postId: number, data: { title: string; content: string; category: string }): void {
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => (p.id === postId ? { ...p, ...data } : p))
    }));
  }

  deletePost(postId: number): void {
    this.database.state.update(state => ({ ...state, posts: state.posts.filter(p => p.id !== postId) }));
  }

  togglePin(postId: number): void {
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => (p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
    }));
  }

  vote(postId: number, userId: number, voteType: 'up' | 'down'): void {
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => {
        if (p.id !== postId) return p;

        const post = { ...p };
        post.upvotedBy = post.upvotedBy || [];
        post.downvotedBy = post.downvotedBy || [];

        const hasUpvoted = post.upvotedBy.includes(userId);
        const hasDownvoted = post.downvotedBy.includes(userId);

        if (voteType === 'up') {
          if (hasUpvoted) {
            post.upvotedBy = post.upvotedBy.filter(id => id !== userId);
          } else {
            post.upvotedBy.push(userId);
            if (hasDownvoted) {
              post.downvotedBy = post.downvotedBy.filter(id => id !== userId);
            }
          }
        } else { // 'down'
          if (hasDownvoted) {
            post.downvotedBy = post.downvotedBy.filter(id => id !== userId);
          } else {
            post.downvotedBy.push(userId);
            if (hasUpvoted) {
              post.upvotedBy = post.upvotedBy.filter(id => id !== userId);
            }
          }
        }

        post.upvotes = post.upvotedBy.length;
        post.downvotes = post.downvotedBy.length;
        
        return post;
      })
    }));
  }

  addComment(postId: number, author: User, text: string): void {
    const newComment: ForumComment = {
      id: this.getNextCommentId(),
      authorId: author.id,
      authorUsername: author.username,
      authorProfilePictureUrl: author.profilePictureUrl,
      text: text,
      createdAt: new Date(),
      likes: 1,
      dislikes: 0,
      likedBy: [author.id],
      dislikedBy: [],
      replies: [],
    };

    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [newComment, ...p.comments] };
        }
        return p;
      })
    }));
  }
  
  // Recursive helper for comment operations
  private mapComments(comments: ForumComment[], callback: (c: ForumComment) => ForumComment | null): ForumComment[] {
    return comments.map(comment => {
        // Apply callback to the current comment
        const updatedCommentOrNull = callback(comment);
        if (updatedCommentOrNull === null) return null; // This will be filtered out

        let updatedComment = { ...updatedCommentOrNull };
        
        // Recursively map replies
        if (updatedComment.replies && updatedComment.replies.length > 0) {
            updatedComment.replies = this.mapComments(updatedComment.replies, callback);
        }
        
        return updatedComment;
    }).filter((c): c is ForumComment => c !== null);
  }


  addReply(postId: number, parentCommentId: number, author: User, text: string): void {
    const newReply: ForumComment = {
      id: this.getNextCommentId(),
      authorId: author.id,
      authorUsername: author.username,
      authorProfilePictureUrl: author.profilePictureUrl,
      text: text,
      createdAt: new Date(),
      likes: 1,
      dislikes: 0,
      likedBy: [author.id],
      dislikedBy: [],
      replies: [],
    };
    
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => {
        if (p.id === postId) {
          const updatedComments = this.mapComments(p.comments, (c) => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [newReply, ...(c.replies || [])] };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    }));
  }

  editComment(postId: number, commentId: number, newText: string): void {
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => {
        if (p.id === postId) {
          const updatedComments = this.mapComments(p.comments, (c) => {
            if (c.id === commentId) {
              return { ...c, text: newText };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    }));
  }

  deleteComment(postId: number, commentId: number): void {
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => {
        if (p.id === postId) {
          const updatedComments = this.mapComments(p.comments, (c) => {
            if (c.id === commentId) {
              return null; // Signal for deletion
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    }));
  }

  voteOnComment(postId: number, commentId: number, userId: number, voteType: 'like' | 'dislike'): void {
    this.database.state.update(state => ({
      ...state,
      posts: state.posts.map(p => {
        if (p.id === postId) {
          const updatedComments = this.mapComments(p.comments, (c) => {
            if (c.id === commentId) {
              const comment = { ...c };
              comment.likedBy = comment.likedBy || [];
              comment.dislikedBy = comment.dislikedBy || [];

              const hasLiked = comment.likedBy.includes(userId);
              const hasDisliked = comment.dislikedBy.includes(userId);

              if (voteType === 'like') {
                if (hasLiked) {
                  comment.likedBy = comment.likedBy.filter(id => id !== userId);
                } else {
                  comment.likedBy.push(userId);
                  if (hasDisliked) {
                    comment.dislikedBy = comment.dislikedBy.filter(id => id !== userId);
                  }
                }
              } else { // 'dislike'
                if (hasDisliked) {
                  comment.dislikedBy = comment.dislikedBy.filter(id => id !== userId);
                } else {
                  comment.dislikedBy.push(userId);
                  if (hasLiked) {
                    comment.likedBy = comment.likedBy.filter(id => id !== userId);
                  }
                }
              }
              comment.likes = comment.likedBy.length;
              comment.dislikes = comment.dislikedBy.length;
              return comment;
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    }));
  }
}
