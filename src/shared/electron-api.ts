import type { AppSettings } from './settings';

export interface ElectronAPI {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  recordingStarted: () => void;
  recordingStopped: () => void;
  isRecording: () => Promise<boolean>;
  onCapsuleState: (callback: (state: string, data?: unknown) => void) => () => void;
  onRecordingState: (callback: (state: string) => void) => () => void;
  hideCapsule: () => void;
  hideQuickPanel: () => void;
  showMainWindow: () => void;
  windowMinimize: () => void;
  windowClose: () => void;
  clipboardSave: () => Promise<string>;
  clipboardRestore: (text: string) => Promise<void>;
  clipboardWrite: (text: string) => Promise<void>;
  dashScopeStart: () => Promise<boolean>;
  dashScopeAudioChunk: (audioChunk: ArrayBuffer) => void;
  dashScopeFinish: () => Promise<string>;
  simulatePaste: () => Promise<boolean>;
}
