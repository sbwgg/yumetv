
export interface ForumComment {
  id: number;
  authorId: number;
  authorUsername: string;
  authorProfilePictureUrl?: string;
  text: string;
  createdAt: Date;
  likes: number;
  dislikes: number;
  likedBy: number[];
  dislikedBy: number[];
  replies: ForumComment[];
}

export interface ForumPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  authorUsername: string;
  authorProfilePictureUrl?: string;
  authorRole: 'user' | 'mod' | 'admin';
  category: string;
  createdAt: Date;
  isPinned: boolean;
  upvotes: number;
  downvotes: number;
  upvotedBy?: number[];
  downvotedBy?: number[];
  comments: ForumComment[];
}
