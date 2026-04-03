import { BrowserWindow, screen } from 'electron';

type Params = {
  currentWindow: BrowserWindow | null;
  preloadPath: string;
  htmlPath: string;
  onClosed: () => void;
};

export function ensureCapsuleWindow(params: Params) {
  if (params.currentWindow) {
    return params.currentWindow;
  }

  const display = screen.getPrimaryDisplay();
  const width = 720;
  const height = 148;
  const marginBottom = 12;

  const window = new BrowserWindow({
    width,
    height,
    x: Math.round(display.workArea.x + (display.workArea.width - width) / 2),
    y: display.workArea.y + display.workArea.height - height - marginBottom,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    focusable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: params.preloadPath,
    },
  });

  window.webContents.on('did-fail-load', (_, code, description, url, isMainFrame) => {
    console.error('[capsule] did-fail-load', { code, description, url, isMainFrame });
  });

  window.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log('[capsule] console', { level, message, line, sourceId });
  });

  window.webContents.on('render-process-gone', (_, details) => {
    console.error('[capsule] render-process-gone', details);
  });

  window.loadFile(params.htmlPath).catch((error) => {
    console.error('[capsule] loadFile failed', error);
  });
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.on('closed', () => {
    params.onClosed();
  });

  return window;
}
