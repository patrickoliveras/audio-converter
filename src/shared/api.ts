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
} from './types';

export type Unsubscribe = () => void;

export interface AudioConverterApi {
  selectInputFile: () => Promise<SelectedFile | null>;
  selectOutputFolder: () => Promise<SelectedFolder | null>;
  selectOutputFile: (defaultPath: string) => Promise<{ path: string } | null>;
  suggestOutputPath: (inputPath: string, outputFolderPath: string | null) => Promise<string>;
  pathExists: (targetPath: string) => Promise<boolean>;
  startConversion: (req: StartConversionRequest) => Promise<StartConversionResponse>;
  cancelConversion: (jobId: string) => Promise<void>;
  revealItemInFolder: (targetPath: string) => Promise<void>;
  revealLogs: () => Promise<void>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;

  // i18n
  getI18n: () => Promise<I18nBundle>;

  onConversionProgress: (listener: (ev: ConversionProgressEvent) => void) => Unsubscribe;
  onConversionDone: (listener: (ev: ConversionDoneEvent) => void) => Unsubscribe;
  onConversionError: (listener: (ev: ConversionErrorEvent) => void) => Unsubscribe;
}

