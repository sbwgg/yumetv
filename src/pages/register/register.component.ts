

import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  authService = inject(AuthService);
  router: Router = inject(Router);

  username = '';
  email = '';
  password = '';
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal(false);

  async onRegister() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    const result = await this.authService.register(this.username, this.email, this.password);
    
    if (result.success) {
      this.successMessage.set(result.message!);
    } else {
      this.errorMessage.set(result.message!);
    }
    this.isLoading.set(false);
  }
}