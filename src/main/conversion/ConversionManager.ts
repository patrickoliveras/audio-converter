import log from 'electron-log';

import type {
  ConversionDoneEvent,
  ConversionErrorEvent,
  ConversionProgressEvent,
  StartConversionRequest
} from '../../shared/types';
import { AppError } from '../appError';
import { getFfmpegPath, getFfprobePath } from './binaries';
import { ConversionJob, type ConversionJobCallbacks } from './ConversionJob';

export class ConversionManager {
  private current: { job: ConversionJob; req: StartConversionRequest } | null = null;

  async start(
    req: StartConversionRequest,
    callbacks: Omit<ConversionJobCallbacks, 'onDone' | 'onError'> & {
      onDone: (ev: ConversionDoneEvent) => void;
      onError: (ev: ConversionErrorEvent) => void;
    }
  ): Promise<{ jobId: string }> {
    if (this.current) {
      throw new AppError('JOB_IN_PROGRESS', 'A conversion is already running.');
    }

    const ffmpegPath = getFfmpegPath();
    const ffprobePath = getFfprobePath();

    const job = new ConversionJob(req, ffmpegPath, ffprobePath, {
      onProgress: (ev: ConversionProgressEvent) => callbacks.onProgress(ev),
      onDone: (ev: ConversionDoneEvent) => {
        this.current = null;
        callbacks.onDone(ev);
      },
      onError: (ev: ConversionErrorEvent) => {
        this.current = null;
        callbacks.onError(ev);
      }
    });

    this.current = { job, req };
    log.info(`[conversion:${job.id}] starting`);
    await job.start();

    return { jobId: job.id };
  }

  async cancel(jobId: string): Promise<void> {
    const current = this.current;
    if (!current || current.job.id !== jobId) {
      throw new AppError('JOB_NOT_FOUND', 'No matching conversion job was found.');
    }

    log.info(`[conversion:${jobId}] cancelling`);
    await current.job.cancel();
  }
}
