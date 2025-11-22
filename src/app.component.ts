import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { SettingsService } from './services/settings.service';
import { AuthService } from './services/auth.service';
import { TranslatePipe } from './pipes/translate.pipe';
import { DomainService } from './services/domain.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, TranslatePipe],
})
export class AppComponent {
  settingsService = inject(SettingsService);
  authService = inject(AuthService);
  domainService = inject(DomainService);
  // FIX: Explicitly type the injected Title to resolve compilation error.
  private titleService: Title = inject(Title);
  // FIX: Explicitly type the injected Router to resolve compilation error.
  router: Router = inject(Router);
  
  private routerEvents = toSignal(this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
  ));

  constructor() {
    effect(() => {
      this.titleService.setTitle(this.settingsService.settings().siteName);
    });

    // Domain-based routing effect
    effect(() => {
        const event = this.routerEvents();
        if (event) {
            const url = event.urlAfterRedirects;
            const isAdminPanel = this.domainService.isAdminPanel();

            // If on admin domain but not on an admin-related page, force to admin.
            // Allow '/login' for authentication.
            if (isAdminPanel && !url.startsWith('/admin') && !url.startsWith('/login')) {
                this.router.navigate(['/admin']);
            }

            // If on main domain but trying to access admin page, force to home.
            if (!isAdminPanel && url.startsWith('/admin')) {
                this.router.navigate(['/']);
            }
        }
    }, { allowSignalWrites: true });
  }

  isAdminPanel(): boolean {
      return this.domainService.isAdminPanel();
  }

  isPlayerPage(): boolean {
    return this.router.url.startsWith('/watch');
  }

  isMaintenanceActive(): boolean {
    const maintenanceMode = this.settingsService.settings().maintenanceMode;
    const currentUser = this.authService.currentUser();
    const isAdminPage = this.router.url.startsWith('/admin');
    const isLoginPage = this.router.url.startsWith('/login');

    if (!maintenanceMode.enabled) {
      return false;
    }

    if (isLoginPage) {
      return false;
    }

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'mod') && isAdminPage) {
      return false;
    }
    
    return true;
  }
}
