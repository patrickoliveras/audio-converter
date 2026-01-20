import { contextBridge, ipcRenderer } from 'electron';

import type { AudioConverterApi } from '../shared/api';
import { Ipc } from '../shared/ipc';
import type {
  AppSettings,
  ConversionDoneEvent,
  ConversionErrorEvent,
  ConversionProgressEvent,
  I18nBundle,
  SelectedFile,
  SelectedFolder,
  StartConversionRequest,
  StartConversionResponse
} from '../shared/types';

function onEvent<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: T) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api: AudioConverterApi = {
  selectInputFile: () => ipcRenderer.invoke(Ipc.SelectInputFile) as Promise<SelectedFile | null>,
  selectOutputFolder: () => ipcRenderer.invoke(Ipc.SelectOutputFolder) as Promise<SelectedFolder | null>,
  selectOutputFile: (defaultPath) =>
    ipcRenderer.invoke(Ipc.SelectOutputFile, defaultPath) as Promise<{ path: string } | null>,
  suggestOutputPath: (inputPath, outputFolderPath) =>
    ipcRenderer.invoke(Ipc.SuggestOutputPath, inputPath, outputFolderPath) as Promise<string>,
  pathExists: (targetPath) => ipcRenderer.invoke(Ipc.PathExists, targetPath) as Promise<boolean>,
  startConversion: (req: StartConversionRequest) =>
    ipcRenderer.invoke(Ipc.StartConversion, req) as Promise<StartConversionResponse>,
  cancelConversion: (jobId: string) => ipcRenderer.invoke(Ipc.CancelConversion, jobId) as Promise<void>,
  revealItemInFolder: (targetPath: string) =>
    ipcRenderer.invoke(Ipc.RevealItemInFolder, targetPath) as Promise<void>,
  revealLogs: () => ipcRenderer.invoke(Ipc.RevealLogs) as Promise<void>,

  // Settings
  getSettings: () => ipcRenderer.invoke(Ipc.GetSettings) as Promise<AppSettings>,
  updateSettings: (partial) => ipcRenderer.invoke(Ipc.UpdateSettings, partial) as Promise<AppSettings>,

  // i18n
  getI18n: () => ipcRenderer.invoke(Ipc.GetI18n) as Promise<I18nBundle>,

  onConversionProgress: (listener: (ev: ConversionProgressEvent) => void) =>
    onEvent<ConversionProgressEvent>(Ipc.EventProgress, listener),
  onConversionDone: (listener: (ev: ConversionDoneEvent) => void) =>
    onEvent<ConversionDoneEvent>(Ipc.EventDone, listener),
  onConversionError: (listener: (ev: ConversionErrorEvent) => void) =>
    onEvent<ConversionErrorEvent>(Ipc.EventError, listener)
};

contextBridge.exposeInMainWorld('audioConverter', api);

