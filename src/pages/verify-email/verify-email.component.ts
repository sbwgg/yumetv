import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './verify-email.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  status = signal<'verifying' | 'success' | 'error'>('verifying');
  message = signal('');

  private token$ = this.route.params.pipe(map(params => params['token']));

  ngOnInit(): void {
    const token = toSignal(this.token$)();
    if (token) {
      const result = this.authService.verifyEmail(token);
      if (result.success) {
        this.status.set('success');
        this.message.set(result.message);
      } else {
        this.status.set('error');
        this.message.set(result.message);
      }
    } else {
      this.status.set('error');
      this.message.set('errorInvalidToken');
    }
  }
}