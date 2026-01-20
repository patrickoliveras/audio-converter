export type FfmpegProgressSnapshot = {
  outTimeMs: number | null;
  progress: 'continue' | 'end';
};

function parseFfmpegOutTimeToUs(value: string): number | null {
  // Expected format: HH:MM:SS.microseconds (microseconds part may be omitted)
  // Example: 00:00:01.234567
  const m = /^(\d+):([0-5]?\d):([0-5]?\d)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) return null;

  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = Number(m[3]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds))
    return null;

  const fractional = m[4] ?? '';
  // Pad/truncate to microseconds precision.
  const padded = (fractional + '000000').slice(0, 6);
  const micros = padded.length ? Number(padded) : 0;
  if (!Number.isFinite(micros)) return null;

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds * 1_000_000 + micros;
}

export class FfmpegProgressParser {
  private buffer = '';
  private lastOutTimeUs: number | null = null;

  feed(chunk: Buffer | string): FfmpegProgressSnapshot[] {
    this.buffer += chunk.toString();

    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';

    const snapshots: FfmpegProgressSnapshot[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex <= 0) continue;

      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);

      if (key === 'out_time_us' || key === 'out_time_ms') {
        // Important: despite the name, ffmpeg's `out_time_ms` is historically reported in microseconds.
        // Treat both keys as microseconds for consistent behavior across ffmpeg versions.
        const n = Number(value);
        this.lastOutTimeUs = Number.isFinite(n) ? n : this.lastOutTimeUs;
      }

      if (key === 'out_time') {
        const us = parseFfmpegOutTimeToUs(value);
        this.lastOutTimeUs = us ?? this.lastOutTimeUs;
      }

      if (key === 'progress' && (value === 'continue' || value === 'end')) {
        const outTimeMs = this.lastOutTimeUs == null ? null : Math.floor(this.lastOutTimeUs / 1000);
        snapshots.push({
          outTimeMs,
          progress: value
        });
      }
    }

    return snapshots;
  }
}
