import { spawn } from 'node:child_process';

import { AppError } from '../appError';

export async function getDurationMs(
  ffprobePath: string,
  inputPath: string
): Promise<number | null> {
  return await new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nw=1:nk=1',
      inputPath
    ];

    const child = spawn(ffprobePath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (d) => {
      stdout += d;
    });
    // Drain stderr to avoid backpressure/hangs if ffprobe emits warnings.
    child.stderr.on('data', () => {});

    child.on('error', (err) => {
      reject(
        new AppError(
          'FFPROBE_FAILED',
          'Failed to read audio metadata.',
          err instanceof Error ? err.message : String(err)
        )
      );
    });

    child.on('close', (code) => {
      if (code !== 0) {
        // Duration is best-effort; allow conversion to proceed without % progress.
        resolve(null);
        return;
      }

      const seconds = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(seconds) || seconds <= 0) {
        resolve(null);
        return;
      }

      resolve(Math.round(seconds * 1000));
    });
  });
}
