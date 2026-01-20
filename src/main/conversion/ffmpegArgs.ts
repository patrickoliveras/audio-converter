import path from 'node:path';

import { AppError } from '../appError';
import type { StartConversionRequest } from '../../shared/types';

export function ensureM4aOutputPath(outputPath: string): void {
  if (path.extname(outputPath).toLowerCase() !== '.m4a') {
    throw new AppError('INVALID_OUTPUT', 'Output file must have a .m4a extension.');
  }
}

export function buildFfmpegArgs(params: {
  inputPath: string;
  tempOutputPath: string;
  bitrateKbps: number;
}): string[] {
  const { inputPath, tempOutputPath, bitrateKbps } = params;

  // Keep knobs minimal and deterministic.
  return [
    '-hide_banner',
    '-nostdin',
    // Intentionally do NOT use -y here. We write to a temp file and rename on success.
    '-i',
    inputPath,
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    `${bitrateKbps}k`,
    '-movflags',
    '+faststart',
    '-progress',
    'pipe:2',
    '-nostats',
    tempOutputPath
  ];
}

export function validateStartRequest(req: StartConversionRequest): void {
  if (!req || typeof req !== 'object') {
    throw new AppError('INVALID_REQUEST', 'Invalid conversion request.');
  }
  if (typeof req.inputPath !== 'string' || req.inputPath.length === 0) {
    throw new AppError('INVALID_INPUT', 'Input path is required.');
  }
  if (typeof req.outputPath !== 'string' || req.outputPath.length === 0) {
    throw new AppError('INVALID_OUTPUT', 'Output path is required.');
  }
  if (typeof req.bitrateKbps !== 'number' || !Number.isFinite(req.bitrateKbps) || req.bitrateKbps <= 0) {
    throw new AppError('INVALID_BITRATE', 'Bitrate must be a positive number.');
  }
  if (typeof req.overwrite !== 'boolean') {
    throw new AppError('INVALID_REQUEST', 'Overwrite must be a boolean.');
  }
  ensureM4aOutputPath(req.outputPath);
}

