import { Injectable, signal, inject, computed, Signal, effect } from '@angular/core';
import { User, WatchedItem } from '../shared/models/user.model';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';

const USERS_STORAGE_KEY = 'yume_tv_users';
const CURRENT_USER_STORAGE_KEY = 'yume_tv_currentUser';
const RECENTLY_WATCHED_LIMIT = 24; // Increased limit for per-episode tracking

@Injectable({ providedIn: 'root' })
export class AuthService {
  // NOTE: In a real-world application, passwords should be securely hashed before being stored.
  // This implementation uses plaintext passwords for demonstration purposes only.

  private users = signal<User[]>([]);
  currentUser = signal<User | null>(null);

  private router: Router = inject(Router);
  private storageService = inject(StorageService);

  constructor() {
    this.initializeStateFromStorage();
    
    effect(() => {
      this.storageService.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users()));
    });
    
    effect(() => {
       const user = this.currentUser();
       if (user) {
         this.storageService.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
       } else {
         this.storageService.removeItem(CURRENT_USER_STORAGE_KEY);
       }
    });
  }

  private initializeStateFromStorage() {
    const storedUsers = this.storageService.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      // FIX: Cast parsed data to User[] to ensure correct typing for the signal.
      this.users.set(JSON.parse(storedUsers, (key, value) => {
        if (key === 'watchedAt' && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      }) as User[]);
    } else {
      this.users.set([]);
    }

    const storedCurrentUser = this.storageService.getItem(CURRENT_USER_STORAGE_KEY);
    if (storedCurrentUser) {
        // FIX: Cast parsed data to User to ensure correct typing for the signal.
        this.currentUser.set(JSON.parse(storedCurrentUser, (key, value) => {
           if (key === 'watchedAt' && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        }) as User);
    }
  }
  
  getUsers(): Signal<User[]> {
      return this.users.asReadonly();
  }

  getUserById(id: number): User | undefined {
    return this.users().find(u => u.id === id);
  }

  login(username: string, password: string): boolean {
    const user = this.users().find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (user && user.password === password) {
      this.currentUser.set(user);
      return true;
    }
    return false;
  }

  register(username: string, email: string, password: string): { success: boolean, message: string } {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (this.users().some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
        return { success: false, message: 'errorUsernameExists' };
    }
    if (this.users().some(u => u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
        return { success: false, message: 'errorEmailExists' };
    }
    
    const isFirstUser = this.users().length === 0;

    const newUser: User = {
        id: Math.max(...this.users().map(u => u.id), 0) + 1,
        username: trimmedUsername,
        email: trimmedEmail,
        password, // SECURITY: NEVER store plaintext passwords in a real application. This should be a securely generated hash.
        role: isFirstUser ? 'admin' : 'user',
        recentlyWatched: []
    };
    
    this.users.update(currentUsers => [...currentUsers, newUser]);
    
    const successMessage = isFirstUser 
      ? 'registerSuccessAdmin'
      : 'registerSuccessUser';
      
    return { success: true, message: successMessage };
  }

  logout() {
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  updateUserRole(userId: number, role: 'user' | 'mod' | 'admin') {
    this.users.update(users => 
      users.map(u => u.id === userId ? { ...u, role } : u)
    );
    if (this.currentUser()?.id === userId) {
        this.currentUser.update(u => u ? {...u, role} : null);
    }
  }

  updateUserProfile(updates: { username?: string; password?: string; profilePictureUrl?: string }): { success: boolean; message: string } {
    const currentUser = this.currentUser();
    if (!currentUser) {
        return { success: false, message: 'errorNoUserLoggedIn' };
    }

    let updatedUser = { ...currentUser };
    let needsUpdate = false;

    // Check username change
    if (updates.username && updates.username.trim() && updates.username !== currentUser.username) {
        if (this.users().some(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== currentUser.id)) {
            return { success: false, message: 'errorUsernameTaken' };
        }
        updatedUser.username = updates.username.trim();
        needsUpdate = true;
    }

    // Check password change
    if (updates.password) {
        // SECURITY: CRITICAL - In a production environment, NEVER store the password in plaintext.
        // You would hash the new password here before saving it.
        // e.g., updatedUser.password = await hashPassword(updates.password);
        updatedUser.password = updates.password;
        needsUpdate = true;
    }

    // Check profile picture change
    if (updates.profilePictureUrl) {
        updatedUser.profilePictureUrl = updates.profilePictureUrl;
        needsUpdate = true;
    }
    
    if (needsUpdate) {
        this.currentUser.set(updatedUser);
        this.users.update(users => users.map(u => u.id === currentUser.id ? updatedUser : u));
        return { success: true, message: 'profileUpdateSuccess' };
    }

    return { success: false, message: 'errorNoChanges' };
  }

  trackMediaProgress(data: {
    mediaId: number;
    progress: number;
    duration: number;
    seasonNumber?: number;
    episodeNumber?: number;
  }) {
    const currentUser = this.currentUser();
    if (!currentUser || !data.duration) return;

    const updateUser = (user: User | null): User | null => {
      if (!user) return null;
      
      let watched = [...(user.recentlyWatched || [])];
      
      const itemIndex = watched.findIndex(item =>
        item.mediaId === data.mediaId &&
        item.seasonNumber === data.seasonNumber && // Works for undefined === undefined
        item.episodeNumber === data.episodeNumber
      );

      if (itemIndex > -1) {
        watched.splice(itemIndex, 1);
      }
      
      const newItem: WatchedItem = {
        ...data,
        watchedAt: new Date(),
      };
      
      watched.unshift(newItem);
      
      if (watched.length > RECENTLY_WATCHED_LIMIT) {
        watched = watched.slice(0, RECENTLY_WATCHED_LIMIT);
      }
      
      return { ...user, recentlyWatched: watched };
    };

    // Update the master users list
    this.users.update(currentUsers =>
      currentUsers.map(u => u.id === currentUser.id ? updateUser(u)! : u)
    );
    
    // Update the currently logged-in user signal
    this.currentUser.update(updateUser);
  }

  getWatchedProgress(mediaId: number, seasonNumber?: number, episodeNumber?: number): WatchedItem | undefined {
    const user = this.currentUser();
    if (!user || !user.recentlyWatched) {
      return undefined;
    }
    return user.recentlyWatched.find(item => 
      item.mediaId === mediaId &&
      item.seasonNumber === seasonNumber &&
      item.episodeNumber === episodeNumber
    );
  }
}
