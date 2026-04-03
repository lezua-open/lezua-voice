import Store from 'electron-store';
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/settings';

const store = new Store<{ settings: AppSettings }>({
  defaults: { settings: DEFAULT_SETTINGS },
});

export function getSettings(): AppSettings {
  const settings = store.get('settings', DEFAULT_SETTINGS) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...settings };
}

export function saveSettings(settings: AppSettings): void {
  store.set('settings', { ...DEFAULT_SETTINGS, ...settings });
}
