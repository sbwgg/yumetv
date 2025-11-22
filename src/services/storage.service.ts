import { Injectable } from '@angular/core';

/**
 * A service to handle persistent storage. It uses cookies to allow
 * for state sharing across subdomains (e.g., yume.tv and panel.yume.tv),
 * which is not possible with localStorage due to the same-origin policy.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {

  private getRootDomain(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      // Don't set a domain for localhost or direct IP addresses
      return ''; 
    }
    const parts = hostname.split('.');
    // Handle domains like 'example.com' and 'sub.example.com'
    const rootDomain = parts.length > 1 ? parts.slice(-2).join('.') : hostname;
    return `domain=.${rootDomain}`;
  }
  
  setItem(key: string, value: string): void {
     const domain = this.getRootDomain();
     // Set a cookie that expires in 1 year
     const expires = `expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}`;
     // Using encodeURIComponent to handle special characters in JSON string
     document.cookie = `${key}=${encodeURIComponent(value)}; ${expires}; path=/; ${domain}; SameSite=Lax; Secure`;
  }

  getItem(key: string): string | null {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.split('=', 2);
      if (cookieKey === key) {
        // Decode the value which was encoded
        return cookieValue ? decodeURIComponent(cookieValue) : null;
      }
    }
    return null;
  }

  removeItem(key: string): void {
    const domain = this.getRootDomain();
    // To delete a cookie, set its expiration date to the past
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; ${domain};`;
  }
}
