import { Injectable, computed, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { MaintenanceMode, PlayerSettings, Settings } from '../shared/models/settings.model';


@Injectable({ providedIn: 'root' })
export class SettingsService {
  private database = inject(DatabaseService);

  settings = computed(() => this.database.state().settings);

  setMaintenanceMode(maintenanceMode: MaintenanceMode) {
    this.database.state.update(state => ({ 
      ...state, 
      settings: { ...state.settings, maintenanceMode }
    }));
  }

  updatePlayerSettings(playerSettings: Partial<PlayerSettings>) {
    this.database.state.update(state => ({
      ...state,
      settings: { 
        ...state.settings, 
        player: { ...state.settings.player, ...playerSettings } 
      }
    }));
  }

  updateSettings(updates: { siteName: string, maintenanceMode: MaintenanceMode }): void {
      this.database.state.update(state => ({
          ...state,
          settings: {
              ...state.settings,
              siteName: updates.siteName,
              maintenanceMode: updates.maintenanceMode
          }
      }));
  }
}
