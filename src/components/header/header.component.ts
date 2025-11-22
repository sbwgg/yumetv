
import { Component, ChangeDetectionStrategy, inject, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { TranslationService, Language } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class HeaderComponent {
  authService = inject(AuthService);
  settingsService = inject(SettingsService);
  translationService = inject(TranslationService);
  private elementRef = inject(ElementRef);
  currentUser = this.authService.currentUser;

  isProfileMenuOpen = signal(false);
  isLanguageMenuOpen = signal(false);

  isAdminOrMod(): boolean {
    const user = this.currentUser();
    return !!user && (user.role === 'admin' || user.role === 'mod');
  }

  logout() {
    this.isProfileMenuOpen.set(false);
    this.authService.logout();
  }

  toggleProfileMenu() {
    this.isLanguageMenuOpen.set(false);
    this.isProfileMenuOpen.update(v => !v);
  }

  toggleLanguageMenu() {
    this.isProfileMenuOpen.set(false);
    this.isLanguageMenuOpen.update(v => !v);
  }

  setLanguage(lang: Language) {
    this.translationService.setLanguage(lang);
    this.isLanguageMenuOpen.set(false);
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isProfileMenuOpen.set(false);
      this.isLanguageMenuOpen.set(false);
    }
  }
}