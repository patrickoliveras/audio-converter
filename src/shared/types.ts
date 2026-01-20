export type SelectedFile = {
  path: string;
  name: string;
};

export type SelectedFolder = {
  path: string;
};

export type StartConversionRequest = {
  inputPath: string;
  outputPath: string;
  bitrateKbps: number;
  overwrite: boolean;
};

export type StartConversionResponse = {
  jobId: string;
};

export type ConversionProgressEvent = {
  jobId: string;
  percent: number | null;
  outTimeMs: number | null;
};

export type ConversionDoneEvent = {
  jobId: string;
  outputPath: string;
};

export type ConversionErrorEvent = {
  jobId: string;
  code: string;
  message: string;
  details?: string;
};

export type AppSettings = {
  notificationsEnabled: boolean;
};

export type I18nBundle = {
  locale: string;
  translations: Record<string, string>;
};
