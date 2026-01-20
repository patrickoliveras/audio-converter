import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

import { AppError } from '../appError';

function resolveAsarUnpackedPath(maybeAsarPath: string): string {
  // In packaged Electron apps, `spawn()` cannot execute from inside `app.asar`.
  // When the binary is marked as `asarUnpack`, it exists on disk under `app.asar.unpacked`.
  // Using this replacement is a pragmatic guard that avoids hard-to-debug production failures.
  if (maybeAsarPath.includes('app.asar') && !maybeAsarPath.includes('app.asar.unpacked')) {
    return maybeAsarPath.replace('app.asar', 'app.asar.unpacked');
  }
  return maybeAsarPath;
}

export function getFfmpegPath(): string {
  if (typeof ffmpegPath !== 'string' || ffmpegPath.length === 0) {
    throw new AppError(
      'FFMPEG_NOT_FOUND',
      'FFmpeg binary not found. The app may be missing a bundled encoder.'
    );
  }
  return resolveAsarUnpackedPath(ffmpegPath);
}

export function getFfprobePath(): string {
  const p = ffprobeStatic.path;
  if (typeof p !== 'string' || p.length === 0) {
    throw new AppError(
      'FFPROBE_NOT_FOUND',
      'FFprobe binary not found. The app may be missing a bundled decoder.'
    );
  }
  return resolveAsarUnpackedPath(p);
}
