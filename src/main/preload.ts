import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  recordingStarted: () => ipcRenderer.send('recording-started'),
  recordingStopped: () => ipcRenderer.send('recording-stopped'),
  isRecording: () => ipcRenderer.invoke('is-recording'),

  onCapsuleState: (callback: (state: string, data?: unknown) => void) => {
    ipcRenderer.on('capsule-state', (_, state, data) => callback(state, data));
  },
  onRecordingState: (callback: (state: string) => void) => {
    ipcRenderer.on('recording-state', (_, state) => callback(state));
  },

  hideCapsule: () => ipcRenderer.send('hide-capsule'),
  showMainWindow: () => ipcRenderer.send('show-main-window'),

  clipboardSave: () => ipcRenderer.invoke('clipboard-save'),
  clipboardRestore: (text: string) => ipcRenderer.invoke('clipboard-restore', text),
  clipboardWrite: (text: string) => ipcRenderer.invoke('clipboard-write', text),

  dashScopeStart: () => ipcRenderer.invoke('dashscope-start'),
  dashScopeAudioChunk: (audioChunk: ArrayBuffer) => ipcRenderer.send('dashscope-audio-chunk', audioChunk),
  dashScopeFinish: () => ipcRenderer.invoke('dashscope-finish'),

  simulatePaste: () => ipcRenderer.invoke('simulate-paste'),
});
