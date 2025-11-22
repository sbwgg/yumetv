
import { Component, ChangeDetectionStrategy, inject, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  authService = inject(AuthService);
  settingsService = inject(SettingsService);
  router = inject(Router);

  currentUser = this.authService.currentUser;

  // --- Page State ---
  activeTab = signal<'profile' | 'account' | 'player'>('profile');

  // --- Player Settings ---
  autoPlay = signal(this.settingsService.settings().player.autoPlay);
  autoNext = signal(this.settingsService.settings().player.autoNext);
  playerSettingsMessage = signal<string | null>(null);

  // --- Profile Picture ---
  newProfilePicture = signal<string | null>(null);
  pfpMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);

  // --- Username Change ---
  newUsername = signal(this.currentUser()?.username || '');
  usernameMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);

  // --- Password Change ---
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  passwordMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);
  
  savePlayerSettings() {
    this.settingsService.updatePlayerSettings({
      autoPlay: this.autoPlay(),
      autoNext: this.autoNext()
    });
    this.playerSettingsMessage.set('playerSettingsSaved');
    setTimeout(() => this.playerSettingsMessage.set(null), 3000);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
       if (file.size > 2 * 1024 * 1024) { // 2MB limit
        this.pfpMessage.set({ type: 'error', text: 'errorFileTooLarge' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => this.newProfilePicture.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }
  
  saveProfilePicture() {
    if (!this.newProfilePicture()) return;
    const result = this.authService.updateUserProfile({ profilePictureUrl: this.newProfilePicture()! });
    if (result.success) {
      this.pfpMessage.set({ type: 'success', text: result.message });
      this.newProfilePicture.set(null);
    } else {
      this.pfpMessage.set({ type: 'error', text: result.message });
    }
    setTimeout(() => this.pfpMessage.set(null), 3000);
  }
  
  saveUsername() {
    this.usernameMessage.set(null);
    const result = this.authService.updateUserProfile({ username: this.newUsername() });
    if (result.success) {
      this.usernameMessage.set({ type: 'success', text: result.message });
    } else {
      this.usernameMessage.set({ type: 'error', text: result.message });
    }
    setTimeout(() => this.usernameMessage.set(null), 3000);
  }

  savePassword() {
    this.passwordMessage.set(null);
    const user = this.currentUser();

    if (!user) {
      this.passwordMessage.set({ type: 'error', text: 'errorNoUserLoggedIn' });
      return;
    }
    if (this.currentPassword() !== user.password) {
      this.passwordMessage.set({ type: 'error', text: 'errorCurrentPasswordIncorrect' });
      return;
    }
    if (this.newPassword().length < 6) {
      this.passwordMessage.set({ type: 'error', text: 'errorNewPasswordLength' });
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordMessage.set({ type: 'error', text: 'errorPasswordsDoNotMatch' });
      return;
    }

    const result = this.authService.updateUserProfile({ password: this.newPassword() });
    if (result.success) {
      this.passwordMessage.set({ type: 'success', text: 'passwordChangedSuccess' });
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
    } else {
       this.passwordMessage.set({ type: 'error', text: result.message });
    }
    setTimeout(() => this.passwordMessage.set(null), 3000);
  }
}