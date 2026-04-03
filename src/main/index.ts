import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, clipboard, screen } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { execFile } from 'child_process';
import WebSocket from 'ws';

interface Settings {
  hotkey: string;
  language: string;
  transcriptionApiKey: string;
  llmEnabled: boolean;
  llmApiUrl: string;
  llmApiKey: string;
  llmModel: string;
  transcriptionApiUrl: string;
  transcriptionModel: string;
  audioDeviceId: string;
  startWithSystem: boolean;
}

interface DashScopeSession {
  ws: WebSocket;
  taskId: string;
  transcript: string;
  started: boolean;
  settled: boolean;
  finishRequested: boolean;
  finishSent: boolean;
  pendingChunks: Buffer[];
  startPromise: Promise<void>;
  finishPromise: Promise<string>;
  resolveStart: () => void;
  rejectStart: (error: Error) => void;
  resolveFinish: (text: string) => void;
  rejectFinish: (error: Error) => void;
}

const defaultSettings: Settings = {
  hotkey: 'Ctrl+Shift+V',
  language: 'zh-CN',
  transcriptionApiKey: '',
  llmEnabled: false,
  llmApiUrl: 'https://api.openai.com/v1/chat/completions',
  llmApiKey: '',
  llmModel: 'gpt-4o-mini',
  transcriptionApiUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
  transcriptionModel: 'gummy-chat-v1',
  audioDeviceId: 'default',
  startWithSystem: false,
};

const store = new Store<{ settings: Settings }>({
  defaults: { settings: defaultSettings },
});

let mainWindow: BrowserWindow | null = null;
let capsuleWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;
let dashScopeSession: DashScopeSession | null = null;

const isDev = !app.isPackaged;
const htmlPath = (name: string) =>
  isDev
    ? path.join(__dirname, '..', '..', 'src', 'renderer', name)
    : path.join(__dirname, '..', '..', 'renderer', name);

const preloadPath = path.join(__dirname, 'preload.js');

function getSettings(): Settings {
  const settings = store.get('settings', defaultSettings) as Partial<Settings>;
  return { ...defaultSettings, ...settings };
}

function saveSettings(settings: Settings): void {
  store.set('settings', { ...defaultSettings, ...settings });
}

function sendCapsuleState(state: string, data?: unknown): void {
  capsuleWindow?.webContents.send('capsule-state', state, data);
}

function createMainWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 620,
    height: 860,
    show: false,
    resizable: false,
    title: 'VoiceTranscribe 设置',
    backgroundColor: '#0f1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  mainWindow.loadFile(htmlPath('settings.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.on('close', (event) => {
    if (mainWindow) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createCapsuleWindow(): void {
  if (capsuleWindow) return;

  const display = screen.getPrimaryDisplay();
  const width = 760;
  const height = 160;

  capsuleWindow = new BrowserWindow({
    width,
    height,
    x: Math.round(display.workArea.x + (display.workArea.width - width) / 2),
    y: display.workArea.y + display.workArea.height - 176,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  capsuleWindow.loadFile(htmlPath('capsule.html'));
  capsuleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  capsuleWindow.on('closed', () => {
    capsuleWindow = null;
  });
}

function showCapsule(): void {
  if (!capsuleWindow) createCapsuleWindow();
  capsuleWindow?.showInactive();
}

function hideCapsule(): void {
  capsuleWindow?.hide();
}

function trayMenuTemplate() {
  return [
    { label: isRecording ? '状态：录音中' : '状态：就绪', enabled: false },
    {
      label: isRecording ? '停止录音' : '开始录音',
      click: () => {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      },
    },
    { type: 'separator' as const },
    { label: '打开设置', click: () => createMainWindow() },
    { label: '退出', click: () => app.quit() },
  ];
}

function rebuildTrayMenu(): void {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate(trayMenuTemplate()));
}

function createTray(): void {
  const iconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFfSURBVDiNpZM9SwNBEIafvdxdQqKFHxCwgYWVlaX/gI2dnYWdjb/gj+fr6O/oL+gPWFlZWFhYWPgLfoCNjY2FhYWFra+5u/V6iUQSu8QdHlgGmJ155plZdnaXAOCqHBwAKLk+ADYAZQDXk1sDAB4BtwHoAogA3AG+ASLgGXDu+s4dR3d9H0ANwCqgCGAK0AIwBXgA7Lm+5wNIA5gC9F3fu+t7aQBzgAGAKcAAwBSg7/qeZ18dQAbAAqALIA1gxvWd2z4AqANYAPQATAF69rUEaAFYAIwBJvYSgDRA1/WdG3sB0AIwB5gAjO0lAHOAAYApwMBxfeeG3gC0ASwApgA9+1oCtAEsAKYAPftYArQBLABmAD37WgG0ASwAZgA9+1oDtAEsAGYAPftaB7QBmAFM7WsD0AZgBjC1ry1AG4AZwMy+dgBtAGYAM/vaCbQBmAHM7CcAtAGYAczsaxfQBmAGMLWvPUDbAWBqXwfQNfA/lR+B/6w/A/8B8AH4G2fM1X0AAAAASUVORK5CYII=';
  tray = new Tray(nativeImage.createFromDataURL(iconDataUrl));
  tray.setToolTip('VoiceTranscribe');
  rebuildTrayMenu();
  tray.on('click', () => createMainWindow());
}

function startRecording(): void {
  if (isRecording) return;
  isRecording = true;
  rebuildTrayMenu();
  showCapsule();
  sendCapsuleState('recording');
  mainWindow?.webContents.send('recording-state', 'recording');
}

function stopRecording(): void {
  if (!isRecording) return;
  isRecording = false;
  rebuildTrayMenu();
  sendCapsuleState('stop');
  mainWindow?.webContents.send('recording-state', 'idle');
}

function registerHotkey(): void {
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

function destroyDashScopeSession() {
  if (!dashScopeSession) return;
  try { dashScopeSession.ws.close(); } catch {}
  dashScopeSession = null;
}

function flushPendingAudio(session: DashScopeSession) {
  while (session.pendingChunks.length > 0 && session.started && !session.finishSent) {
    const chunk = session.pendingChunks.shift();
    if (chunk) {
      session.ws.send(chunk, { binary: true });
    }
  }

  if (session.finishRequested && !session.finishSent && session.started) {
    session.finishSent = true;
    session.ws.send(JSON.stringify({
      header: {
        action: 'finish-task',
        task_id: session.taskId,
        streaming: 'duplex',
      },
      payload: {
        input: {},
      },
    }));
  }
}

async function startDashScopeSession(settings: Settings): Promise<void> {
  const transcriptionApiKey = (settings.transcriptionApiKey || '').trim();
  if (!settings.transcriptionApiUrl || !transcriptionApiKey) {
    throw new Error('缺少百炼接口地址或阿里云 API Key');
  }

  if (dashScopeSession) {
    destroyDashScopeSession();
  }

  const taskId = crypto.randomUUID();
  let resolveStart: () => void = () => {};
  let rejectStart: (error: Error) => void = () => {};
  let resolveFinish: (text: string) => void = () => {};
  let rejectFinish: (error: Error) => void = () => {};

  const startPromise = new Promise<void>((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });
  const finishPromise = new Promise<string>((resolve, reject) => {
    resolveFinish = resolve;
    rejectFinish = reject;
  });

  const ws = new WebSocket(settings.transcriptionApiUrl, {
    headers: {
      Authorization: `Bearer ${transcriptionApiKey}`,
    },
  });

  const session: DashScopeSession = {
    ws,
    taskId,
    transcript: '',
    started: false,
    settled: false,
    finishRequested: false,
    finishSent: false,
    pendingChunks: [],
    startPromise,
    finishPromise,
    resolveStart,
    rejectStart,
    resolveFinish,
    rejectFinish,
  };

  dashScopeSession = session;

  const fail = (error: Error) => {
    if (session.settled) return;
    session.settled = true;
    session.rejectStart(error);
    session.rejectFinish(error);
    destroyDashScopeSession();
  };

  const succeed = (text: string) => {
    if (session.settled) return;
    session.settled = true;
    session.resolveFinish(text);
    destroyDashScopeSession();
  };

  ws.on('open', () => {
    ws.send(JSON.stringify({
      header: {
        action: 'run-task',
        task_id: taskId,
        streaming: 'duplex',
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: settings.transcriptionModel || 'gummy-chat-v1',
        parameters: {
          format: 'pcm',
          sample_rate: 16000,
          transcription_enabled: true,
          translation_enabled: false,
        },
        input: {},
      },
    }));
  });

  ws.on('message', (raw: WebSocket.RawData) => {
    const rawText = typeof raw === 'string' ? raw : raw.toString();
    console.log('[DashScope WS]', rawText);

    try {
      const message = JSON.parse(rawText);
      const event = message.header?.event;

      if (event === 'task-started') {
        session.started = true;
        session.resolveStart();
        flushPendingAudio(session);
        return;
      }

      if (event === 'result-generated') {
        const output = message.payload?.output;
        const transcription = output?.transcription;
        const text = output?.text
          || output?.sentence_text
          || output?.sentence?.text
          || output?.transcript
          || (typeof transcription === 'string' ? transcription : transcription?.text)
          || '';

        if (typeof text === 'string' && text) {
          session.transcript = text;
          sendCapsuleState('live-transcript', {
            text,
            isFinal: Boolean(transcription?.sentence_end),
          });
        }
        return;
      }

      if (event === 'task-finished') {
        succeed((session.transcript || '').trim());
        return;
      }

      if (event === 'task-failed') {
        const errorMessage = message.header?.error_message
          || message.payload?.message
          || '百炼转写失败';
        fail(new Error(errorMessage));
      }
    } catch (error) {
      fail(error instanceof Error ? error : new Error('百炼响应解析失败'));
    }
  });

  ws.on('error', (error) => {
    fail(error instanceof Error ? error : new Error('百炼连接失败'));
  });

  ws.on('close', (code, reason) => {
    if (session.settled) return;
    if (session.finishRequested && session.transcript) {
      succeed((session.transcript || '').trim());
      return;
    }
    fail(new Error(`百炼连接已关闭，close=${code} reason=${reason.toString()}`));
  });

  await session.startPromise;
}

function pushDashScopeAudioChunk(audioChunk: Buffer) {
  if (!dashScopeSession || dashScopeSession.settled) return;

  if (!dashScopeSession.started || dashScopeSession.finishRequested) {
    dashScopeSession.pendingChunks.push(audioChunk);
    return;
  }

  dashScopeSession.ws.send(audioChunk, { binary: true });
}

async function finishDashScopeSession(): Promise<string> {
  if (!dashScopeSession) {
    throw new Error('当前没有进行中的百炼会话');
  }

  dashScopeSession.finishRequested = true;
  flushPendingAudio(dashScopeSession);
  return await dashScopeSession.finishPromise;
}

function setupIpcHandlers(): void {
  ipcMain.handle('get-settings', () => getSettings());
  ipcMain.handle('save-settings', (_, settings: Settings) => {
    saveSettings(settings);
    registerHotkey();
    return true;
  });
  ipcMain.handle('is-recording', () => isRecording);

  ipcMain.on('recording-started', () => startRecording());
  ipcMain.on('recording-stopped', () => stopRecording());
  ipcMain.on('hide-capsule', () => hideCapsule());
  ipcMain.on('show-main-window', () => createMainWindow());

  ipcMain.handle('clipboard-save', () => clipboard.readText());
  ipcMain.handle('clipboard-restore', (_, text: string) => clipboard.writeText(text));
  ipcMain.handle('clipboard-write', (_, text: string) => clipboard.writeText(text));

  ipcMain.handle('dashscope-start', async () => {
    const settings = getSettings();
    await startDashScopeSession(settings);
    return true;
  });
  ipcMain.on('dashscope-audio-chunk', (_, audioChunk: ArrayBuffer) => {
    pushDashScopeAudioChunk(Buffer.from(new Uint8Array(audioChunk)));
  });
  ipcMain.handle('dashscope-finish', async () => {
    return await finishDashScopeSession();
  });

  ipcMain.handle('simulate-paste', async () => {
    return new Promise<boolean>((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys("^v")'],
        (error) => resolve(!error),
      );
    });
  });
}

app.whenReady().then(() => {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => createMainWindow());
  setupIpcHandlers();
  createTray();
  createCapsuleWindow();
  registerHotkey();
});

app.on('window-all-closed', () => {
  // 保持托盘常驻
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  destroyDashScopeSession();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  destroyDashScopeSession();
});

export { getSettings, saveSettings };
