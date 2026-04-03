import { BrowserWindow, Rectangle, screen } from 'electron';

type Params = {
  currentWindow: BrowserWindow | null;
  preloadPath: string;
  htmlPath: string;
  trayBounds: Rectangle;
  onClosed: () => void;
};

function getPanelPosition(width: number, height: number, trayBounds: Rectangle) {
  const display = screen.getDisplayNearestPoint({
    x: Math.round(trayBounds.x + trayBounds.width / 2),
    y: Math.round(trayBounds.y + trayBounds.height / 2),
  });

  const { workArea } = display;
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2);
  let y = Math.round(trayBounds.y - height - 10);

  if (y < workArea.y) {
    y = Math.round(trayBounds.y + trayBounds.height + 10);
  }

  x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - width - 8));
  y = Math.max(workArea.y + 8, Math.min(y, workArea.y + workArea.height - height - 8));

  return { x, y };
}

export function ensureQuickPanelWindow(params: Params) {
  const width = 420;
  const height = 560;
  const position = getPanelPosition(width, height, params.trayBounds);

  if (params.currentWindow) {
    params.currentWindow.setBounds({ x: position.x, y: position.y, width, height });
    return params.currentWindow;
  }

  const window = new BrowserWindow({
    width,
    height,
    x: position.x,
    y: position.y,
    show: false,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundMaterial: 'mica',
    backgroundColor: '#0f1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: params.preloadPath,
    },
  });

  window.webContents.on('did-fail-load', (_, code, description, url, isMainFrame) => {
    console.error('[quick-panel] did-fail-load', { code, description, url, isMainFrame });
  });

  window.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log('[quick-panel] console', { level, message, line, sourceId });
  });

  window.webContents.on('render-process-gone', (_, details) => {
    console.error('[quick-panel] render-process-gone', details);
  });

  window.loadFile(params.htmlPath).catch((error) => {
    console.error('[quick-panel] loadFile failed', error);
  });
  window.removeMenu();
  window.setMenuBarVisibility(false);
  window.on('blur', () => {
    if (window.isVisible()) {
      window.hide();
    }
  });
  window.on('closed', () => {
    params.onClosed();
  });

  return window;
}
