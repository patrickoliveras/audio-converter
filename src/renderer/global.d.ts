import type { AudioConverterApi } from '../shared/api';

declare global {
  interface Window {
    audioConverter: AudioConverterApi;
  }
}

export {};

