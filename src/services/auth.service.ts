import { Injectable, signal, inject, computed, Signal, effect } from '@angular/core';
import { User, WatchedItem, PendingUser } from '../shared/models/user.model';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { DatabaseService } from './database.service';

const CURRENT_USER_STORAGE_KEY = 'yume_tv_currentUser';
const RECENTLY_WATCHED_LIMIT = 24;

@Injectable({ providedIn: 'root' })
export class AuthService {
  // NOTE: In a real-world application, passwords should be securely hashed.
  // This implementation uses plaintext passwords for demonstration purposes.
  private database = inject(DatabaseService);

  private users = computed(() => this.database.state().users);
  private pendingUsers = computed(() => this.database.state().pendingUsers);
  currentUser = signal<User | null>(null);

  private router: Router = inject(Router);
  private storageService = inject(StorageService);

  constructor() {
    this.initializeStateFromStorage();
    
    // Persist current logged-in user (session) to storage on change
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
    // Only the current user session is stored in the browser's cookies
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
  
  private getAppConfig() {
    const defaultConfig = {
      ADMIN_USER: 'admin',
      ADMIN_PASSWORD: 'password',
      RESEND_API_KEY: '',
      RESEND_FROM_EMAIL: 'noreply@example.com'
    };
    const globalConfig = (window as any).YUME_TV_CONFIG;
    if (globalConfig) {
      return { ...defaultConfig, ...globalConfig };
    }
    console.warn('env.js not found or YUME_TV_CONFIG not set. Using default development values. Please see README.md for production setup.');
    return defaultConfig;
  }

  getUsers(): Signal<User[]> {
      return this.users.asReadonly();
  }

  getUserById(id: number): User | undefined {
    return this.users().find(u => u.id === id);
  }

  login(username: string, password: string): { success: boolean, message: string } {
    const trimmedUsername = username.trim();
    const config = this.getAppConfig();
    
    // 1. Check for Super Admin from environment variables
    const adminUser = config.ADMIN_USER;
    const adminPass = config.ADMIN_PASSWORD;
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
    
    this.database.state.update(state => ({ ...state, pendingUsers: [...state.pendingUsers, newPendingUser]}));
    await this.sendVerificationEmail(newPendingUser);
      
    return { success: true, message: 'registerSuccessPending' };
  }

  private simulateVerificationEmail(user: PendingUser): void {
    const verificationLink = `${window.location.origin}/#/verify-email/${user.verificationToken}`;
    console.warn(`
      ================================================================================
      [EMAIL SIMULATION] - CONFIGURE env.js FOR REAL EMAILS
      This is a fallback because Resend API key is not configured in env.js.
      
      Verification link for ${user.email}:
      ${verificationLink}
      ================================================================================
    `);
  }

  private async sendVerificationEmail(user: PendingUser): Promise<void> {
    const config = this.getAppConfig();
    const apiKey = config.RESEND_API_KEY;
    const fromEmail = config.RESEND_FROM_EMAIL;
    
    if (!apiKey || apiKey.startsWith('re_') === false || !fromEmail || fromEmail === 'noreply@example.com') {
      this.simulateVerificationEmail(user);
      return;
    }

    const verificationLink = `${window.location.origin}/#/verify-email/${user.verificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email for Yume TV</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #0B1120; color: #F1F5F9; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #1E293B; border-radius: 8px; border: 1px solid #334155; padding: 40px; text-align: center;">
          <h1 style="color: #3B82F6; font-size: 28px; margin-top: 0;">Welcome to Yume TV!</h1>
          <p style="font-size: 16px; color: #94A3B8; line-height: 1.5;">
            Thanks for signing up! Please click the button below to verify your email address and complete your registration.
          </p>
          <a href="${verificationLink}" target="_blank" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 15px 25px; margin: 25px 0; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Verify Email Address
          </a>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            If you did not create an account, no further action is required.<br>
            This link will expire in 24 hours.
          </p>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [user.email],
          subject: 'Verify Your Email Address for Yume TV',
          html: emailHtml
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send verification email via Resend:', errorData);
        this.simulateVerificationEmail(user); // Fallback for safety
      } else {
        console.log(`Production verification email successfully sent to ${user.email} via Resend.`);
      }
    } catch (error) {
      console.error('Network or other error sending verification email:', error);
      this.simulateVerificationEmail(user); // Fallback for safety
    }
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean, message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const pendingUser = this.pendingUsers().find(u => u.email === trimmedEmail);

    if (!pendingUser) {
      return { success: false, message: 'errorEmailNotFound' };
    }
    
    // Refresh token and expiry
    const updatedPendingUser = {
      ...pendingUser,
      verificationToken: crypto.randomUUID(),
      tokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.database.state.update(state => ({
      ...state,
      pendingUsers: state.pendingUsers.map(u => u.email === trimmedEmail ? updatedPendingUser : u)
    }));
    
    await this.sendVerificationEmail(updatedPendingUser);
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
    
    this.database.state.update(state => ({
        ...state,
        users: [...state.users, newUser],
        pendingUsers: state.pendingUsers.filter(u => u.verificationToken !== token)
    }));

    return { success: true, message: isFirstUser ? 'verifySuccessAdmin' : 'verifySuccessUser' };
  }

  logout() {
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  updateUserRole(userId: number, role: 'user' | 'mod' | 'admin') {
    this.database.state.update(state => ({
      ...state,
      users: state.users.map(u => u.id === userId ? { ...u, role } : u)
    }));

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
    const allUsers = this.users();
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (!userToUpdate) {
        return { success: false, message: 'errorUserNotFound' };
    }

    let updatedUser = { ...userToUpdate };
    let needsUpdate = false;

    // Check username change
    if (updates.username && updates.username.trim() && updates.username !== userToUpdate.username) {
        if (allUsers.some(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== userId)) {
            return { success: false, message: 'errorUsernameTaken' };
        }
        updatedUser.username = updates.username.trim();
        needsUpdate = true;
    }

    // Check email change
    if (updates.email && updates.email.trim() && updates.email !== userToUpdate.email) {
        if (allUsers.some(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== userId)) {
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
        this.database.state.update(state => ({
          ...state,
          users: state.users.map(u => u.id === userId ? updatedUser : u)
        }));
        
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

    this.database.state.update(state => ({
      ...state,
      users: state.users.map(u => u.id === currentUser.id ? updateUser(u)! : u)
    }));
    
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
