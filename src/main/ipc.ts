import { app, dialog, ipcMain, Notification, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

import log from 'electron-log';

import { normalizeLocale, t } from '../shared/i18n';
import en from '../shared/i18n/locales/en.json';
import es from '../shared/i18n/locales/es.json';
import { Ipc } from '../shared/ipc';
import type {
  AppSettings,
  I18nBundle,
  SelectedFile,
  SelectedFolder,
  StartConversionRequest
} from '../shared/types';
import { AppError } from './appError';
import { ConversionManager } from './conversion/ConversionManager';
import { loadSettings, updateSettings } from './settings';

const localeData: Record<string, Record<string, string>> = { en, es };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function registerIpcHandlers(
  getMainWindowWebContents: () => Electron.WebContents | null
): void {
  const conversions = new ConversionManager();

  ipcMain.handle(Ipc.SelectInputFile, async (): Promise<SelectedFile | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio',
          extensions: ['wav', 'aiff', 'aif', 'flac', 'mp3', 'm4a', 'ogg']
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    if (!filePath) return null;
    return { path: filePath, name: path.basename(filePath) };
  });

  ipcMain.handle(Ipc.SelectOutputFolder, async (): Promise<SelectedFolder | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    const folderPath = result.filePaths[0];
    if (!folderPath) return null;
    return { path: folderPath };
  });

  ipcMain.handle(
    Ipc.SelectOutputFile,
    async (_event, defaultPath: unknown): Promise<{ path: string } | null> => {
      if (!isNonEmptyString(defaultPath)) {
        throw new AppError('INVALID_REQUEST', 'defaultPath must be a string.');
      }

      const result = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: 'M4A Audio', extensions: ['m4a'] }]
      });

      if (result.canceled || !result.filePath) return null;
      return { path: result.filePath };
    }
  );

  ipcMain.handle(
    Ipc.SuggestOutputPath,
    async (_event, inputPath: unknown, outputFolderPath: unknown): Promise<string> => {
      if (!isNonEmptyString(inputPath)) {
        throw new AppError('INVALID_INPUT', 'inputPath must be a string.');
      }

      const folder =
        outputFolderPath == null
          ? path.dirname(inputPath)
          : isNonEmptyString(outputFolderPath)
            ? outputFolderPath
            : (() => {
                throw new AppError('INVALID_OUTPUT', 'outputFolderPath must be a string or null.');
              })();

      const baseName = path.parse(inputPath).name || 'output';
      return path.join(folder, `${baseName}.m4a`);
    }
  );

  ipcMain.handle(Ipc.PathExists, async (_event, targetPath: unknown): Promise<boolean> => {
    if (!isNonEmptyString(targetPath)) {
      throw new AppError('INVALID_REQUEST', 'targetPath must be a string.');
    }
    return await pathExists(targetPath);
  });

  ipcMain.handle(Ipc.RevealItemInFolder, async (_event, targetPath: unknown): Promise<void> => {
    if (!isNonEmptyString(targetPath)) {
      throw new AppError('INVALID_REQUEST', 'targetPath must be a string.');
    }
    shell.showItemInFolder(targetPath);
  });

  ipcMain.handle(Ipc.RevealLogs, async (): Promise<void> => {
    const logPath = log.transports.file.getFile().path;
    shell.showItemInFolder(logPath);
  });

  ipcMain.handle(
    Ipc.StartConversion,
    async (_event, req: StartConversionRequest): Promise<{ jobId: string }> => {
      const send = (channel: string, payload: unknown) => {
        const wc = getMainWindowWebContents();
        if (!wc) return;
        wc.send(channel, payload);
      };

      return await conversions.start(req, {
        onProgress: (ev) => send(Ipc.EventProgress, ev),
        onDone: (ev) => {
          send(Ipc.EventDone, ev);

          // Show notification if enabled
          const settings = loadSettings();
          if (settings.notificationsEnabled && Notification.isSupported()) {
            const locale = normalizeLocale(app.getLocale());
            const filename = path.basename(ev.outputPath);
            const notification = new Notification({
              title: t('notification.done.title', locale),
              body: t('notification.done.body', locale, { filename }),
              silent: false
            });
            notification.show();
          }
        },
        onError: (ev) => send(Ipc.EventError, ev)
      });
    }
  );

  ipcMain.handle(Ipc.CancelConversion, async (_event, jobId: unknown): Promise<void> => {
    if (!isNonEmptyString(jobId)) {
      throw new AppError('INVALID_REQUEST', 'jobId must be a string.');
    }
    await conversions.cancel(jobId);
  });

  // Settings
  ipcMain.handle(Ipc.GetSettings, async (): Promise<AppSettings> => {
    return loadSettings();
  });

  ipcMain.handle(Ipc.UpdateSettings, async (_event, partial: unknown): Promise<AppSettings> => {
    if (typeof partial !== 'object' || partial === null) {
      throw new AppError('INVALID_REQUEST', 'Settings must be an object.');
    }
    return updateSettings(partial as Partial<AppSettings>);
  });

  // i18n
  ipcMain.handle(Ipc.GetI18n, async (): Promise<I18nBundle> => {
    const systemLocale = app.getLocale();
    const locale = normalizeLocale(systemLocale);
    return {
      locale,
      translations: localeData[locale] || localeData['en'] || {}
    };
  });

  // Minimal "about" plumbing for future: keep one place to read logs.
  ipcMain.handle('audioConverter:getAppVersion', async (): Promise<string> => app.getVersion());
}
