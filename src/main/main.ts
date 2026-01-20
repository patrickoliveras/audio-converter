import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';

import log from 'electron-log';

import { registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 560,
    height: 540,
    minWidth: 520,
    minHeight: 520,
    title: 'Waveshift',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => {
    // This app is local-only; we never intentionally navigate away from our bundled UI.
    event.preventDefault();
  });

  // In production, we always load from local `dist/renderer`.
  void win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  return win;
}

function setAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [];

  if (process.platform === 'darwin') {
    template.push({
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
    });
  }

  template.push({ role: 'fileMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' });

  template.push({
    role: 'help',
    submenu: [
      {
        label: 'Reveal Logs',
        click: () => {
          const logPath = log.transports.file.getFile().path;
          shell.showItemInFolder(logPath);
        }
      }
    ]
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function initLogging(): void {
  log.transports.file.level = 'info';
  log.transports.console.level = 'info';
  log.errorHandler.startCatching({ showDialog: false });
}

app.whenReady().then(() => {
  initLogging();
  setAppMenu();

  mainWindow = createMainWindow();

  registerIpcHandlers(() => mainWindow?.webContents ?? null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

