export interface MaintenanceMode {
  enabled: boolean;
  message: string;
}

export interface PlayerSettings {
  autoPlay: boolean;
  autoNext: boolean;
}

export interface Settings {
  maintenanceMode: MaintenanceMode;
  player: PlayerSettings;
  siteName: string;
}

export const DEFAULT_SETTINGS: Settings = {
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
