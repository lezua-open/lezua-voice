import { BrowserWindow } from 'electron';

type Params = {
  currentWindow: BrowserWindow | null;
  preloadPath: string;
  htmlPath: string;
  isQuitting: () => boolean;
  onClosed: () => void;
};

export function ensureSettingsWindow(params: Params) {
  if (params.currentWindow) {
    params.currentWindow.show();
    params.currentWindow.focus();
    return params.currentWindow;
  }

  const window = new BrowserWindow({
    width: 620,
    height: 860,
    show: false,
    resizable: false,
    frame: false,
    autoHideMenuBar: true,
    thickFrame: false,
    backgroundMaterial: 'mica',
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: params.preloadPath,
    },
  });

  window.loadFile(params.htmlPath);
  window.removeMenu();
  window.setMenuBarVisibility(false);
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    params.onClosed();
  });
  window.on('close', (event) => {
    if (!params.isQuitting()) {
      event.preventDefault();
      window.hide();
    }
  });

  return window;
}
