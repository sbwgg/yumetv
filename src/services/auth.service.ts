import { Injectable, signal, inject, computed, Signal, effect } from '@angular/core';
import { User, WatchedItem, PendingUser } from '../shared/models/user.model';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';

const USERS_STORAGE_KEY = 'yume_tv_users';
const PENDING_USERS_STORAGE_KEY = 'yume_tv_pending_users';
const CURRENT_USER_STORAGE_KEY = 'yume_tv_currentUser';
const RECENTLY_WATCHED_LIMIT = 24;

@Injectable({ providedIn: 'root' })
export class AuthService {
  // NOTE: In a real-world application, passwords should be securely hashed.
  // This implementation uses plaintext passwords for demonstration purposes.

  private users = signal<User[]>([]);
  private pendingUsers = signal<PendingUser[]>([]);
  currentUser = signal<User | null>(null);

  private router: Router = inject(Router);
  private storageService = inject(StorageService);

  constructor() {
    this.initializeStateFromStorage();
    
    // Persist users and pending users to storage on change
    effect(() => {
      this.storageService.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users()));
    });
    effect(() => {
      this.storageService.setItem(PENDING_USERS_STORAGE_KEY, JSON.stringify(this.pendingUsers()));
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
      this.users.set(JSON.parse(storedUsers, this.jsonDateReviver) as User[]);
    }

    const storedPendingUsers = this.storageService.getItem(PENDING_USERS_STORAGE_KEY);
    if (storedPendingUsers) {
      this.pendingUsers.set(JSON.parse(storedPendingUsers, this.jsonDateReviver) as PendingUser[]);
    }

    const storedCurrentUser = this.storageService.getItem(CURRENT_USER_STORAGE_KEY);
    if (storedCurrentUser) {
        this.currentUser.set(JSON.parse(storedCurrentUser, this.jsonDateReviver) as User);
    }
  }

  private jsonDateReviver(key: string, value: any): any {
    const dateKeys = ['watchedAt', 'tokenExpires'];
    if (dateKeys.includes(key) && typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return value;
  }
  
  getUsers(): Signal<User[]> {
      return this.users.asReadonly();
  }

  getUserById(id: number): User | undefined {
    return this.users().find(u => u.id === id);
  }

  login(username: string, password: string): { success: boolean, message: string } {
    const trimmedUsername = username.trim();

    // 1. Check for Super Admin from environment variables
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'password';
    if (trimmedUsername === adminUser && password === adminPass) {
      const superAdmin: User = {
        id: 0,
        username: 'Site Admin',
        email: 'admin@yume.tv',
        password: '', // Do not store/expose this
        role: 'admin',
        recentlyWatched: []
      };
      this.currentUser.set(superAdmin);
      return { success: true, message: 'loginSuccess' };
    }

    // 2. Check for regular, verified users
    const user = this.users().find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (user && user.password === password) {
      this.currentUser.set(user);
      return { success: true, message: 'loginSuccess' };
    }

    // 3. Check if the user is pending verification
    if (this.pendingUsers().some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.password === password)) {
      return { success: false, message: 'errorUserNotVerified' };
    }
    
    // 4. If no matches, invalid credentials
    return { success: false, message: 'errorInvalidCredentials' };
  }

  async register(username: string, email: string, password: string): Promise<{ success: boolean, message: string }> {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const usernameExists = this.users().some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase()) || 
                           this.pendingUsers().some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (usernameExists) {
        return { success: false, message: 'errorUsernameExists' };
    }
    
    const emailExists = this.users().some(u => u.email.toLowerCase() === trimmedEmail) ||
                        this.pendingUsers().some(u => u.email.toLowerCase() === trimmedEmail);
    if (emailExists) {
        return { success: false, message: 'errorEmailExists' };
    }
    
    const newPendingUser: PendingUser = {
        username: trimmedUsername,
        email: trimmedEmail,
        password, // SECURITY: NEVER store plaintext passwords. Hash this.
        verificationToken: crypto.randomUUID(),
        tokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    
    this.pendingUsers.update(current => [...current, newPendingUser]);
    await this.sendVerificationEmail(newPendingUser);
      
    return { success: true, message: 'registerSuccessPending' };
  }

  private async sendVerificationEmail(user: PendingUser): Promise<void> {
    const verificationLink = `${window.location.origin}/#/verify-email/${user.verificationToken}`;
    
    // --- REAL EMAIL INTEGRATION POINT ---
    // In a production app, you would replace the console.log with a call
    // to your email service API (e.g., SendGrid, Mailgun, AWS SES).
    // See README.md for a detailed example.
    console.log(`
      ===============================================================
      [EMAIL SIMULATION] Verification link for ${user.email}:
      ${verificationLink}
      ===============================================================
    `);
    
    return Promise.resolve();
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean, message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const pendingUser = this.pendingUsers().find(u => u.email === trimmedEmail);

    if (!pendingUser) {
      return { success: false, message: 'errorEmailNotFound' };
    }
    
    // Refresh token and expiry
    pendingUser.verificationToken = crypto.randomUUID();
    pendingUser.tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    this.pendingUsers.update(users => users.map(u => u.email === trimmedEmail ? pendingUser : u));

    await this.sendVerificationEmail(pendingUser);
    return { success: true, message: 'verificationEmailResent' };
  }

  verifyEmail(token: string): { success: boolean, message: string } {
    const pendingUser = this.pendingUsers().find(u => u.verificationToken === token);

    if (!pendingUser) {
      return { success: false, message: 'errorInvalidToken' };
    }
    if (new Date() > new Date(pendingUser.tokenExpires)) {
      return { success: false, message: 'errorExpiredToken' };
    }

    const isFirstUser = this.users().length === 0;
    const newUser: User = {
      id: Math.max(...this.users().map(u => u.id), 0) + 1,
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password,
      role: isFirstUser ? 'admin' : 'user', // First verified user becomes an admin
      recentlyWatched: []
    };
    
    this.users.update(currentUsers => [...currentUsers, newUser]);
    this.pendingUsers.update(current => current.filter(u => u.verificationToken !== token));

    return { success: true, message: isFirstUser ? 'verifySuccessAdmin' : 'verifySuccessUser' };
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
    if (!currentUser || currentUser.id === 0) { // Site Admin cannot be modified this way
        return { success: false, message: 'errorNoUserLoggedIn' };
    }

    // Pass an empty object for adminUpdateUser's second argument as we're not changing credentials here
    return this.adminUpdateUser(currentUser.id, updates);
  }
  
  adminUpdateUser(userId: number, updates: { username?: string; email?: string; password?: string; profilePictureUrl?: string }): { success: boolean; message: string } {
    const userToUpdate = this.users().find(u => u.id === userId);
    if (!userToUpdate) {
        return { success: false, message: 'errorUserNotFound' };
    }

    let updatedUser = { ...userToUpdate };
    let needsUpdate = false;

    // Check username change
    if (updates.username && updates.username.trim() && updates.username !== userToUpdate.username) {
        if (this.users().some(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== userId)) {
            return { success: false, message: 'errorUsernameTaken' };
        }
        updatedUser.username = updates.username.trim();
        needsUpdate = true;
    }

    // Check email change
    if (updates.email && updates.email.trim() && updates.email !== userToUpdate.email) {
        if (this.users().some(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== userId)) {
            return { success: false, message: 'errorEmailExists' };
        }
        updatedUser.email = updates.email.trim();
        needsUpdate = true;
    }

    // Check password change
    if (updates.password && updates.password.length >= 6) {
        updatedUser.password = updates.password;
        needsUpdate = true;
    }

    // Check profile picture change
    if (updates.profilePictureUrl) {
        updatedUser.profilePictureUrl = updates.profilePictureUrl;
        needsUpdate = true;
    }
    
    if (needsUpdate) {
        this.users.update(users => users.map(u => u.id === userId ? updatedUser : u));
        // If the admin is editing their own account (not the super admin)
        if (this.currentUser()?.id === userId) {
          this.currentUser.set(updatedUser);
        }
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
    if (!currentUser || currentUser.id === 0 || !data.duration) return;

    const updateUser = (user: User | null): User | null => {
      if (!user) return null;
      
      let watched = [...(user.recentlyWatched || [])];
      
      const itemIndex = watched.findIndex(item =>
        item.mediaId === data.mediaId &&
        item.seasonNumber === data.seasonNumber &&
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

    this.users.update(currentUsers =>
      currentUsers.map(u => u.id === currentUser.id ? updateUser(u)! : u)
    );
    
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