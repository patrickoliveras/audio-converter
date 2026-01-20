import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

import log from 'electron-log';

export interface AppSettings {
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true
};

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();

  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(data) as Partial<AppSettings>;

      // Merge with defaults to handle missing keys from older versions
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    log.warn('Failed to load settings, using defaults:', err);
  }

  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  const settingsPath = getSettingsPath();

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    log.error('Failed to save settings:', err);
  }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const updated = { ...current, ...partial };
  saveSettings(updated);
  return updated;
}
