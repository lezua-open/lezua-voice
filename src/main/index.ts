import { app, BrowserWindow, globalShortcut, ipcMain, Tray } from 'electron';
import * as path from 'path';
import type { AppSettings } from '../shared/settings';
import { DEFAULT_SETTINGS } from '../shared/settings';
import { getSettings, saveSettings } from './services/settings-store';
import {
  restoreClipboardText,
  saveClipboardText,
  simulatePaste,
  writeClipboardText,
} from './services/clipboard-service';
import { DashScopeSessionManager } from './services/dashscope-session';
import { ensureSettingsWindow } from './windows/settings-window';
import { ensureCapsuleWindow } from './windows/capsule-window';
import { ensureQuickPanelWindow } from './windows/quick-panel-window';
import { buildTrayMenu, createTray } from './tray/tray-menu';

let settingsWindow: BrowserWindow | null = null;
let capsuleWindow: BrowserWindow | null = null;
let quickPanelWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;
let isQuitting = false;

const preloadPath = path.join(__dirname, 'preload.js');
const htmlPath = (name: string) => path.join(__dirname, '..', 'renderer', name);

function sendCapsuleState(state: string, data?: unknown) {
  capsuleWindow?.webContents.send('capsule-state', state, data);
}

const dashScopeSessionManager = new DashScopeSessionManager({
  onLiveTranscript: ({ text, isFinal }) => {
    sendCapsuleState('live-transcript', { text, isFinal });
  },
  onRawMessage: (rawText) => {
    console.log('[DashScope WS]', rawText);
  },
});

function showSettingsWindow() {
  quickPanelWindow?.hide();
  settingsWindow = ensureSettingsWindow({
    currentWindow: settingsWindow,
    preloadPath,
    htmlPath: htmlPath('settings.html'),
    isQuitting: () => isQuitting,
    onClosed: () => {
      settingsWindow = null;
    },
  });
}

function toggleQuickPanel() {
  if (!tray) return;

  quickPanelWindow = ensureQuickPanelWindow({
    currentWindow: quickPanelWindow,
    preloadPath,
    htmlPath: htmlPath('quick-panel.html'),
    trayBounds: tray.getBounds(),
    onClosed: () => {
      quickPanelWindow = null;
    },
  });

  if (quickPanelWindow.isVisible()) {
    quickPanelWindow.hide();
  } else {
    quickPanelWindow.show();
    quickPanelWindow.focus();
  }
}

function ensureCapsule() {
  capsuleWindow = ensureCapsuleWindow({
    currentWindow: capsuleWindow,
    preloadPath,
    htmlPath: htmlPath('capsule.html'),
    onClosed: () => {
      capsuleWindow = null;
    },
  });
}

function showCapsule() {
  ensureCapsule();
  capsuleWindow?.showInactive();
}

function hideCapsule() {
  capsuleWindow?.hide();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const settings = getSettings();
  tray.setContextMenu(
    buildTrayMenu({
      isRecording,
      settings,
      onToggleRecording: () => {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      },
      onChangeLanguage: (language) => {
        saveSettings({ ...settings, language });
        rebuildTrayMenu();
      },
      onChangeTranscriptionModel: (model) => {
        saveSettings({
          ...settings,
          transcriptionModel: model || DEFAULT_SETTINGS.transcriptionModel,
        });
        rebuildTrayMenu();
      },
      onToggleLlm: (enabled) => {
        saveSettings({ ...settings, llmEnabled: enabled });
        rebuildTrayMenu();
      },
      onOpenQuickPanel: () => toggleQuickPanel(),
      onOpenSettings: () => showSettingsWindow(),
      onQuit: () => app.quit(),
    }),
  );
}

function startRecording() {
  if (isRecording) return;
  isRecording = true;
  rebuildTrayMenu();
  showCapsule();
  if (capsuleWindow?.webContents.isLoadingMainFrame()) {
    capsuleWindow.webContents.once('did-finish-load', () => {
      if (isRecording) {
        sendCapsuleState('recording');
      }
    });
  } else {
    sendCapsuleState('recording');
  }
  settingsWindow?.webContents.send('recording-state', 'recording');
  quickPanelWindow?.webContents.send('recording-state', 'recording');
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  rebuildTrayMenu();
  sendCapsuleState('stop');
  settingsWindow?.webContents.send('recording-state', 'idle');
  quickPanelWindow?.webContents.send('recording-state', 'idle');
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  const settings = getSettings();

  const success = globalShortcut.register(settings.hotkey, () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  if (!success) {
    console.error('Failed to register hotkey:', settings.hotkey);
  }
}

function setupIpcHandlers() {
  ipcMain.handle('get-settings', () => getSettings());
  ipcMain.handle('save-settings', (_, settings: AppSettings) => {
    saveSettings(settings);
    registerHotkey();
    rebuildTrayMenu();
    return true;
  });
  ipcMain.handle('is-recording', () => isRecording);

  ipcMain.on('recording-started', () => startRecording());
  ipcMain.on('recording-stopped', () => stopRecording());
  ipcMain.on('hide-capsule', () => hideCapsule());
  ipcMain.on('hide-quick-panel', () => quickPanelWindow?.hide());
  ipcMain.on('show-main-window', () => showSettingsWindow());
  ipcMain.on('window-minimize', () => settingsWindow?.minimize());
  ipcMain.on('window-close', () => {
    settingsWindow?.hide();
  });

  ipcMain.handle('clipboard-save', () => saveClipboardText());
  ipcMain.handle('clipboard-restore', (_, text: string) => restoreClipboardText(text));
  ipcMain.handle('clipboard-write', (_, text: string) => writeClipboardText(text));
  ipcMain.handle('simulate-paste', async () => await simulatePaste());

  ipcMain.handle('dashscope-start', async () => {
    await dashScopeSessionManager.start(getSettings());
    return true;
  });
  ipcMain.on('dashscope-audio-chunk', (_, audioChunk: ArrayBuffer) => {
    dashScopeSessionManager.pushAudioChunk(Buffer.from(new Uint8Array(audioChunk)));
  });
  ipcMain.handle('dashscope-finish', async () => {
    return await dashScopeSessionManager.finish();
  });
}

app.whenReady().then(() => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => showSettingsWindow());
  setupIpcHandlers();

  tray = createTray(() => toggleQuickPanel());
  rebuildTrayMenu();
  ensureCapsule();
  registerHotkey();
});

app.on('window-all-closed', () => {
  // 保持托盘常驻
});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  dashScopeSessionManager.destroy();
  quickPanelWindow?.destroy();
});

app.on('will-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  dashScopeSessionManager.destroy();
  quickPanelWindow?.destroy();
});
