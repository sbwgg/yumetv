

import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

const SETTINGS_STORAGE_KEY = 'yume_tv_settings';

interface MaintenanceMode {
  enabled: boolean;
  message: string;
}

interface PlayerSettings {
  autoPlay: boolean;
  autoNext: boolean;
}

interface Settings {
  maintenanceMode: MaintenanceMode;
  player: PlayerSettings;
  siteName: string;
}

const DEFAULT_SETTINGS: Settings = {
  maintenanceMode: {
    enabled: false,
    message: 'Our services are temporarily unavailable as we\'re working on making things even better.'
  },
  player: {
    autoPlay: true,
    autoNext: true,
  },
  siteName: 'Yume TV'
};


@Injectable({ providedIn: 'root' })
export class SettingsService {
  settings = signal<Settings>(DEFAULT_SETTINGS);
  private storageService = inject(StorageService);
  
  constructor() {
      const storedSettings = this.storageService.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        try {
          const loadedSettings = JSON.parse(storedSettings);
          // Deep merge to ensure new default properties are added if they don't exist in storage
          const mergedSettings: Settings = {
            ...DEFAULT_SETTINGS,
            ...loadedSettings,
            maintenanceMode: {
              ...DEFAULT_SETTINGS.maintenanceMode,
              ...(loadedSettings.maintenanceMode || {}),
            },
            player: {
              ...DEFAULT_SETTINGS.player,
              ...(loadedSettings.player || {}),
            },
          };
          this.settings.set(mergedSettings);
        } catch (e) {
          console.error("Failed to parse settings from storage", e);
          this.settings.set(DEFAULT_SETTINGS);
        }
      }

      effect(() => {
          this.storageService.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings()));
      });
  }

  setMaintenanceMode(maintenanceMode: MaintenanceMode) {
    this.settings.update(settings => ({ ...settings, maintenanceMode }));
  }

  updatePlayerSettings(playerSettings: Partial<PlayerSettings>) {
    this.settings.update(settings => ({
      ...settings,
      player: { ...settings.player, ...playerSettings }
    }));
  }
}
