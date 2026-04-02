import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  // Recording
  recordingStarted: () => ipcRenderer.send('recording-started'),
  recordingStopped: () => ipcRenderer.send('recording-stopped'),
  isRecording: () => ipcRenderer.invoke('is-recording'),

  // Capsule state
  capsuleState: (state: string, data?: unknown) => ipcRenderer.send('capsule-state', state, data),
  onCapsuleState: (callback: (state: string, data?: unknown) => void) => {
    ipcRenderer.on('capsule-state', (_, state, data) => callback(state, data));
  },

  // Recording state updates
  onRecordingState: (callback: (state: string) => void) => {
    ipcRenderer.on('recording-state', (_, state) => callback(state));
  },

  // UI control
  hideCapsule: () => ipcRenderer.send('hide-capsule'),
  showMainWindow: () => ipcRenderer.send('show-main-window'),

  // Clipboard
  clipboardSave: () => ipcRenderer.invoke('clipboard-save'),
  clipboardRestore: (text: string) => ipcRenderer.invoke('clipboard-restore', text),
  clipboardWrite: (text: string) => ipcRenderer.invoke('clipboard-write', text),
  transcribeGummy: (audioBuffer: ArrayBuffer) => ipcRenderer.invoke('transcribe-gummy', audioBuffer),

  // Paste simulation
  simulatePaste: () => ipcRenderer.invoke('simulate-paste'),
});
