import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DomainService {
  private readonly hostname = signal<string>(window.location.hostname);

  // For local development, you can test by editing your hosts file:
  // 127.0.0.1 yume.tv
  // 127.0.0.1 panel.yume.tv
  // In a real environment, this will be based on the actual domain.
  isAdminPanel = computed(() => this.hostname().startsWith('panel.') || this.hostname() === 'panel.localhost');
  isMainSite = computed(() => !this.isAdminPanel());
}
