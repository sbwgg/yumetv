
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  authService = inject(AuthService);
  settingsService = inject(SettingsService);
  router: Router = inject(Router);

  username = '';
  password = '';
  errorMessage = signal<string | null>(null);
  isUnverified = signal(false);
  resendEmail = signal('');
  resendMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);
  isLoading = signal(false);

  onLogin() {
    this.errorMessage.set(null);
    this.isUnverified.set(false);
    this.resendMessage.set(null);

    const result = this.authService.login(this.username, this.password);

    if (result.success) {
      this.router.navigate(['/']);
    } else {
      this.errorMessage.set(result.message);
      if (result.message === 'errorUserNotVerified') {
        this.isUnverified.set(true);
      }
    }
  }

  async onResendVerification() {
    this.isLoading.set(true);
    this.resendMessage.set(null);
    const result = await this.authService.resendVerificationEmail(this.resendEmail());
    if (result.success) {
      this.resendMessage.set({ type: 'success', text: result.message });
    } else {
      this.resendMessage.set({ type: 'error', text: result.message });
    }
    this.isLoading.set(false);
  }
}