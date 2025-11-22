import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  // FIX: Explicitly type the injected Router to resolve compilation error.
  const router: Router = inject(Router);
  const currentUser = authService.currentUser();

  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'mod')) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
