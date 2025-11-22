
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const loggedInGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  // FIX: Explicitly type the injected Router to resolve compilation error.
  const router: Router = inject(Router);
  
  if (authService.currentUser()) {
    return true;
  }
  
  router.navigate(['/login']);
  return false;
};
