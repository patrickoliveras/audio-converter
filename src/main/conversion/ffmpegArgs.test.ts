import { describe, expect, it } from 'vitest';

import { buildFfmpegArgs, ensureM4aOutputPath } from './ffmpegArgs';

describe('ffmpegArgs', () => {
  it('builds deterministic ffmpeg args', () => {
    const args = buildFfmpegArgs({
      inputPath: '/tmp/in.wav',
      tempOutputPath: '/tmp/out.partial-123.m4a',
      bitrateKbps: 256
    });

    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
    expect(args).toContain('-b:a');
    expect(args).toContain('256k');
  });

  it('rejects non-m4a output paths', () => {
    expect(() => ensureM4aOutputPath('/tmp/out.mp3')).toThrow();
    expect(() => ensureM4aOutputPath('/tmp/out.m4a')).not.toThrow();
  });
});
