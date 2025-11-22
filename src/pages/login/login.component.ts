
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
  // FIX: Explicitly type the injected Router to resolve compilation error.
  router: Router = inject(Router);

  username = '';
  password = ''; // Mock password, not used for auth logic
  errorMessage = signal<string | null>(null);

  onLogin() {
    this.errorMessage.set(null);
    if (this.authService.login(this.username, this.password)) {
      this.router.navigate(['/']);
    } else {
      this.errorMessage.set('errorInvalidCredentials');
    }
  }
}