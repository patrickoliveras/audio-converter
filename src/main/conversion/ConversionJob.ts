import { spawn, type ChildProcessByStdio } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';

import log from 'electron-log';

import type {
  ConversionDoneEvent,
  ConversionErrorEvent,
  ConversionProgressEvent,
  StartConversionRequest
} from '../../shared/types';
import { AppError } from '../appError';
import { buildFfmpegArgs, validateStartRequest } from './ffmpegArgs';
import { FfmpegProgressParser } from './ffmpegProgress';
import { getDurationMs } from './ffprobe';

export type ConversionJobCallbacks = {
  onProgress: (ev: ConversionProgressEvent) => void;
  onDone: (ev: ConversionDoneEvent) => void;
  onError: (ev: ConversionErrorEvent) => void;
};

function buildTempOutputPath(finalOutputPath: string, jobId: string): string {
  const dir = path.dirname(finalOutputPath);
  const parsed = path.parse(finalOutputPath);
  const safeBase = parsed.name || 'output';

  // Keep the temp file in the same directory so the final rename is fast and reliable.
  return path.join(dir, `${safeBase}.partial-${jobId}${parsed.ext || '.m4a'}`);
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export class ConversionJob {
  readonly id = crypto.randomUUID();

  private ffmpegProc: ChildProcessByStdio<null, null, Readable> | null = null;
  private cancelled = false;

  constructor(
    private readonly req: StartConversionRequest,
    private readonly ffmpegPath: string,
    private readonly ffprobePath: string,
    private readonly callbacks: ConversionJobCallbacks
  ) {}

  async start(): Promise<void> {
    validateStartRequest(this.req);

    const { inputPath, outputPath, bitrateKbps, overwrite } = this.req;

    const alreadyExists = await fileExists(outputPath);
    if (alreadyExists && !overwrite) {
      throw new AppError('OUTPUT_EXISTS', 'Output file already exists.');
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const durationMs = await getDurationMs(this.ffprobePath, inputPath);
    const tempOutputPath = buildTempOutputPath(outputPath, this.id);

    // Best-effort cleanup in case a previous run left a temp file behind.
    await fs.rm(tempOutputPath, { force: true });

    const args = buildFfmpegArgs({ inputPath, tempOutputPath, bitrateKbps });
    log.info(`[conversion:${this.id}] ffmpeg args:`, args.join(' '));

    const proc = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    this.ffmpegProc = proc;

    const progressParser = new FfmpegProgressParser();

    // Keep a small tail of stderr for debugging user-reported failures.
    const stderrTail: string[] = [];
    const maxTailLines = 80;
    let stderrBuf = '';

    proc.stderr.on('data', (chunk) => {
      // 1) Parse structured progress (from `-progress pipe:2`)
      for (const snap of progressParser.feed(chunk)) {
        const outTimeMs = snap.outTimeMs;
        const percent =
          durationMs && outTimeMs != null && durationMs > 0
            ? Math.max(0, Math.min(1, outTimeMs / durationMs))
            : null;

        this.callbacks.onProgress({
          jobId: this.id,
          percent,
          outTimeMs
        });
      }

      // 2) Also store tail lines for error reporting.
      stderrBuf += chunk.toString();
      const lines = stderrBuf.split(/\r?\n/);
      stderrBuf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        stderrTail.push(trimmed);
        if (stderrTail.length > maxTailLines) stderrTail.shift();
      }
    });

    proc.on('error', async (err) => {
      await fs.rm(tempOutputPath, { force: true });
      this.callbacks.onError({
        jobId: this.id,
        code: 'FFMPEG_FAILED',
        message: 'Failed to start FFmpeg.',
        details: err instanceof Error ? err.message : String(err)
      });
    });

    proc.on('close', async (code, signal) => {
      this.ffmpegProc = null;

      if (this.cancelled) {
        await fs.rm(tempOutputPath, { force: true });
        this.callbacks.onError({
          jobId: this.id,
          code: 'CANCELLED',
          message: 'Conversion cancelled.'
        });
        return;
      }

      if (code === 0) {
        try {
          if (overwrite && (await fileExists(outputPath))) {
            await fs.rm(outputPath, { force: true });
          }
          await fs.rename(tempOutputPath, outputPath);

          this.callbacks.onDone({
            jobId: this.id,
            outputPath
          });
        } catch (err) {
          await fs.rm(tempOutputPath, { force: true });
          this.callbacks.onError({
            jobId: this.id,
            code: 'OUTPUT_WRITE_FAILED',
            message: 'Conversion finished, but saving the output file failed.',
            details: err instanceof Error ? err.message : String(err)
          });
        }
        return;
      }

      await fs.rm(tempOutputPath, { force: true });
      this.callbacks.onError({
        jobId: this.id,
        code: 'FFMPEG_FAILED',
        message: 'FFmpeg reported an error while converting this file.',
        details: [
          `exitCode=${code ?? 'null'}`,
          `signal=${signal ?? 'null'}`,
          stderrTail.length ? `stderrTail:\n${stderrTail.join('\n')}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      });
    });
  }

  async cancel(): Promise<void> {
    this.cancelled = true;

    const proc = this.ffmpegProc;
    if (!proc) return;

    try {
      proc.kill('SIGTERM');
    } catch {
      // no-op
    }

    // Safety net: if it doesn't die quickly, force kill.
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    if (!proc.killed) {
      try {
        proc.kill('SIGKILL');
      } catch {
        // no-op
      }
    }
  }
}
