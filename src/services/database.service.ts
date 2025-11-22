import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User, PendingUser } from '../shared/models/user.model';
import { Media } from '../shared/models/movie.model';
import { ForumPost } from '../shared/models/forum.model';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Settings, DEFAULT_SETTINGS } from '../shared/models/settings.model';

export interface AppState {
  users: User[];
  pendingUsers: PendingUser[];
  media: Media[];
  posts: ForumPost[];
  settings: Settings;
}

const EMPTY_STATE: AppState = {
  users: [],
  pendingUsers: [],
  media: [],
  posts: [],
  settings: DEFAULT_SETTINGS,
};


@Injectable({ providedIn: 'root' })
export class DatabaseService {
  // This is a public, anonymous JSON store used to simulate a database.
  // It allows data to persist across browsers.
  // WARNING: This is for demonstration purposes and is not secure for sensitive production data.
  private readonly DB_URL = 'https://api.jsonstorage.net/v1/json/559e29a8-2234-42f1-9a99-f2f5343462a3/f287413f-dd7d-419b-a324-4f40f00192e2';

  private http = inject(HttpClient);
  private saveTimeout: any;
  
  state = signal<AppState>(EMPTY_STATE);
  
  constructor() {
    this.loadState();

    effect(() => {
      const currentState = this.state();
      // Avoid saving the initial empty state before it's loaded from the remote.
      if (currentState.users.length > 0 || currentState.media.length > 0 || currentState.posts.length > 0) {
        this.debouncedSave(currentState);
      }
    });
  }
  
  private loadState(): void {
    this.http.get<AppState>(this.DB_URL).pipe(
      catchError(() => {
        // If the database is empty or returns an error, seed it with the default state.
        console.warn('Database not found or empty, initializing with default state.');
        return of(EMPTY_STATE);
      })
    ).subscribe(loadedState => {
      // Deep merge settings to ensure new default properties from code are applied over stored settings.
      const mergedSettings: Settings = {
            ...DEFAULT_SETTINGS,
            ...(loadedState.settings || {}),
            maintenanceMode: {
              ...DEFAULT_SETTINGS.maintenanceMode,
              ...(loadedState.settings?.maintenanceMode || {}),
            },
            player: {
              ...DEFAULT_SETTINGS.player,
              ...(loadedState.settings?.player || {}),
            },
          };

      const finalState = {
        ...EMPTY_STATE,
        ...loadedState,
        settings: mergedSettings,
      };

      this.state.set(this.reviveDates(finalState));
    });
  }
  
  private debouncedSave(state: AppState): void {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.http.put(this.DB_URL, state).subscribe({
        next: () => console.log('✅ Database state saved.'),
        error: (err) => console.error('❌ Failed to save database state:', err)
      });
    }, 1500); // Debounce for 1.5 seconds to batch writes
  }

  // Recursively traverses an object and converts ISO date strings back into Date objects.
  private reviveDates(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Check for ISO 8601 date string format
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            obj[key] = date;
          }
        } else if (typeof value === 'object') {
          this.reviveDates(value); // Recurse into nested objects/arrays
        }
      }
    }
    return obj;
  }
}
