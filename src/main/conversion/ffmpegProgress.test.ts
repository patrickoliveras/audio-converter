import { describe, expect, it } from 'vitest';

import { FfmpegProgressParser } from './ffmpegProgress';

describe('FfmpegProgressParser', () => {
  it('emits a snapshot when progress=continue is seen', () => {
    const p = new FfmpegProgressParser();
    // ffmpeg reports `out_time_ms` in microseconds (historical quirk)
    const snaps = p.feed('out_time_ms=1000000\nprogress=continue\n');
    expect(snaps).toEqual([{ outTimeMs: 1000, progress: 'continue' }]);
  });

  it('tracks the last out_time_ms across chunks', () => {
    const p = new FfmpegProgressParser();
    expect(p.feed('out_time_ms=2000000\n')).toEqual([]);
    expect(p.feed('progress=continue\n')).toEqual([{ outTimeMs: 2000, progress: 'continue' }]);
  });

  it('handles partial lines across chunks', () => {
    const p = new FfmpegProgressParser();
    expect(p.feed('out_time_ms=3')).toEqual([]);
    const snaps = p.feed('000000\nprogress=end\n');
    expect(snaps).toEqual([{ outTimeMs: 3000, progress: 'end' }]);
  });

  it('parses out_time=HH:MM:SS.microseconds', () => {
    const p = new FfmpegProgressParser();
    const snaps = p.feed('out_time=00:00:01.500000\nprogress=continue\n');
    expect(snaps).toEqual([{ outTimeMs: 1500, progress: 'continue' }]);
  });
});
