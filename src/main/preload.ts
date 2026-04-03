import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  recordingStarted: () => ipcRenderer.send('recording-started'),
  recordingStopped: () => ipcRenderer.send('recording-stopped'),
  isRecording: () => ipcRenderer.invoke('is-recording'),

  onCapsuleState: (callback: (state: string, data?: unknown) => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: string, data?: unknown) =>
      callback(state, data);
    ipcRenderer.on('capsule-state', listener);
    return () => ipcRenderer.removeListener('capsule-state', listener);
  },
  onRecordingState: (callback: (state: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: string) => callback(state);
    ipcRenderer.on('recording-state', listener);
    return () => ipcRenderer.removeListener('recording-state', listener);
  },

  hideCapsule: () => ipcRenderer.send('hide-capsule'),
  hideQuickPanel: () => ipcRenderer.send('hide-quick-panel'),
  showMainWindow: () => ipcRenderer.send('show-main-window'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose: () => ipcRenderer.send('window-close'),

  clipboardSave: () => ipcRenderer.invoke('clipboard-save'),
  clipboardRestore: (text: string) => ipcRenderer.invoke('clipboard-restore', text),
  clipboardWrite: (text: string) => ipcRenderer.invoke('clipboard-write', text),

  dashScopeStart: () => ipcRenderer.invoke('dashscope-start'),
  dashScopeAudioChunk: (audioChunk: ArrayBuffer) => ipcRenderer.send('dashscope-audio-chunk', audioChunk),
  dashScopeFinish: () => ipcRenderer.invoke('dashscope-finish'),

  simulatePaste: () => ipcRenderer.invoke('simulate-paste'),
});
