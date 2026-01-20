## Waveshift

A small, self-contained **Electron desktop app** that converts audio files to **`.m4a` (AAC)**—one file at a time, no fuss.

### Features

- Drag & drop or file picker
- Progress bar with cancel
- Bundled FFmpeg—no external install needed
- macOS-first (Windows/Linux scaffolded)

### Spec

See `SPEC.md` for full product + technical details.

---

### Development

Requires **Node.js 20+**.

```bash
npm install
npm run start
```

Generate platform icons from `resources/icon.svg`:

```bash
npm run icons
```

### Packaging

Build a local distributable (dir):

```bash
npm run dist
```

Build release artifacts (DMG on macOS, NSIS on Windows, AppImage on Linux):

```bash
npm run release
```

### Distributing on macOS via AirDrop (no Apple Developer ID)

macOS Gatekeeper is strict about apps received from other computers. Without a paid Apple Developer ID (signing + notarization), your friends will still see a warning on first run.

This repo includes a pragmatic workaround for sharing builds:

- **Ad-hoc signing** (no Apple certificate needed) is applied during packaging via `build.afterPack` (`scripts/afterPack.mjs`).
  - This avoids the harsher Gatekeeper dialog: **“Waveshift está dañado y no puede abrirse…”** which usually indicates an invalid/partial signature.
- A **single-file artifact** is produced: a **ZIP** containing `Waveshift.app`, which is ideal for AirDrop.

#### Build the AirDrop-friendly artifact (recommended)

```bash
npm run release:zip
```

Send this file via AirDrop:

- `release/Waveshift-<version>-arm64-mac.zip`

#### First-run instructions for your friends

1. Unzip the file.
2. Drag `Waveshift.app` into `/Applications`.
3. Open it.
   - If macOS blocks it as an “unidentified developer”, they can usually **right-click → Open** once, or use **System Settings → Privacy & Security → Open Anyway**.

#### If they see: “Waveshift está dañado y no puede abrirse…”

This is almost always a quarantine/signature issue. After moving the app to `/Applications`, run:

```bash
xattr -dr com.apple.quarantine "/Applications/Waveshift.app"
```

Then try opening again.

#### Notes / gotchas

- **Apple Silicon vs Intel**: `arm64` builds won’t run on Intel Macs. Build an `x64` (or universal) mac target if you need to support Intel.
- **Optional**: set `WAVESHIFT_SKIP_ADHOC_SIGN=1` to skip ad-hoc signing during packaging (not recommended for sharing builds).
