import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from '../../../shared/settings';

export function useSettingsDraft() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const next = await window.electronAPI.getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...next });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const saveSettings = useCallback(async () => {
    const normalized: AppSettings = {
      ...settings,
      transcriptionApiUrl:
        settings.transcriptionApiUrl.trim() || DEFAULT_SETTINGS.transcriptionApiUrl,
      transcriptionModel:
        settings.transcriptionModel.trim() || DEFAULT_SETTINGS.transcriptionModel,
      llmApiUrl: settings.llmApiUrl.trim() || DEFAULT_SETTINGS.llmApiUrl,
      llmModel: settings.llmModel.trim() || DEFAULT_SETTINGS.llmModel,
      transcriptionApiKey: settings.transcriptionApiKey.trim(),
      llmApiKey: settings.llmApiKey.trim(),
    };

    await window.electronAPI.saveSettings(normalized);
    setSettings(normalized);
    return normalized;
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }, []);

  return {
    settings,
    setSettings,
    updateSetting,
    saveSettings,
    resetSettings,
    loadSettings,
    loading,
  };
}
