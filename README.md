# Waveshift

A small, self-contained **Electron desktop app** that converts audio files to **`.m4a` (AAC)** — one at a time, no fuss.

## Features

- Drag-and-drop or file picker
- Progress bar with cancel
- Bundled FFmpeg (no separate install required)
- macOS-first; Windows/Linux scaffolding included

## Spec

See [`SPEC.md`](SPEC.md) for product and technical details.

---

## Development

### Requirements

- **Node.js 20+** (includes npm)
- **macOS** is the primary target; Windows/Linux support is scaffolded but not the main focus yet.

### Run locally

```bash
npm ci
npm run start
```

### Icons (required for packaging)

`electron-builder` expects platform icon files that are generated from `resources/icon.svg`.

Generate them once on your machine:

```bash
npm run icons
```

Note: `npm run icons` generates `resources/icon.icns` / `resources/icon.ico` and `resources/icons/*`. These generated files are intentionally ignored by `.gitignore` (they’re machine-generated), but they must exist locally for packaging.

If you’re packaging on a new machine (fresh clone, ZIP download, etc.), run this once first.

## Contributing & security

- Contributing guidelines: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Security reporting: [`SECURITY.md`](SECURITY.md)

## Packaging

If you haven’t generated platform icons on this machine yet, run `npm run icons` first.

Build a local distributable (directory):

```bash
npm run dist
```

Build release artifacts (DMG on macOS, NSIS on Windows, AppImage on Linux):

```bash
npm run release
```

## Releases (GitHub)

If GitHub Actions is enabled for this repo, releases are published from Git tags:

- Push a tag like `v0.2.0`
- GitHub Actions builds a macOS ZIP (`release/*-mac.zip`) and attaches it to the GitHub Release

Locally, you can also build the AirDrop-friendly ZIP:

```bash
npm run release:zip
```

## Distributing on macOS via AirDrop (no Apple Developer ID)

macOS Gatekeeper is strict about apps received from other computers. Without a paid Apple Developer ID (signing + notarization), people will still see a first-run warning.

This repo includes pragmatic defaults for sharing builds:

- **Ad-hoc signing** (no Apple certificate needed) is applied during packaging via `build.afterPack` (`scripts/afterPack.mjs`).
  - This helps avoid the harsher “app is damaged” dialog (the exact message may be localized), which often indicates a quarantine/signature mismatch.
- A **single-file artifact** is produced: a **ZIP** containing `Waveshift.app` (ideal for AirDrop).

### Build the AirDrop-friendly artifact (recommended)

```bash
npm run release:zip
```

Send this file via AirDrop:

- `release/Waveshift-<version>-arm64-mac.zip`

### First-run instructions for your friends

1. Unzip the file.
2. Drag `Waveshift.app` into `/Applications`.
3. Open it.
   - If macOS blocks it as an “unidentified developer”, they can usually **right-click → Open** once, or use **System Settings → Privacy & Security → Open Anyway**.

### If they see: “Waveshift is damaged and can’t be opened”

This is almost always a quarantine/signature issue (the exact message may be localized). After moving the app to `/Applications`, run:

```bash
xattr -dr com.apple.quarantine "/Applications/Waveshift.app"
```

Then try opening it again.

### Notes / gotchas

- **Apple Silicon vs Intel**: `arm64` builds won’t run on Intel Macs. Build an `x64` (or universal) mac target if you need to support Intel.
- **Optional**: set `WAVESHIFT_SKIP_ADHOC_SIGN=1` to skip ad-hoc signing during packaging (not recommended for sharing builds).

## Support / issues

If something breaks, please open a GitHub issue and include:

- Your OS version + CPU (Apple Silicon / Intel)
- The app version (or Git commit)
- The input file type
- Relevant logs (Help → Reveal Logs)

## License and third-party notices

- License: MIT (see [`LICENSE`](LICENSE))
- Third-party notices: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
