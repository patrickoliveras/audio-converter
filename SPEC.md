## Waveshift (Electron) — Product + Technical Spec

### TL;DR (what we’re building)

- **A small, offline desktop app** that converts **one audio file at a time** to **`.m4a` (AAC)**.
- **Self-contained**: ships with the required encoder/decoder binaries (no “install FFmpeg” step).
- **User-friendly + simple**: drag/drop or “Choose file”, optional output folder picker, progress, cancel, and clear errors.

### Goals

- **Single-file conversion**: exactly one input file per run (no batch queue in MVP).
- **Input formats**: at least `.wav`; likely also `.aiff`, `.flac`, `.mp3`, `.m4a`, `.ogg` (as supported by the bundled FFmpeg build).
- **Output format**: `.m4a` using **AAC-LC**.
- **Fast + reliable**: conversion happens in a background process, UI remains responsive.
- **Safe by default**: no Node access in the renderer; strict IPC boundaries.
- **Cross-platform friendly**: design for macOS first, but don’t hard-code assumptions that block Windows/Linux.

### Non-goals (MVP)

- **Batch conversion / queues**
- **Tag editing** (artist/album/cover art)
- **Audio editing** (trim, normalize, effects)
- **Cloud features** (accounts, uploads, sync)
- **“All possible codecs” UI** (we keep knobs minimal)

### User experience (MVP)

- **Entry points**
  - Drag a file onto the window, or click **Choose File…**
  - Optional: choose **Output Folder…** (default: same folder as input)
- **Main view**
  - Shows: input filename, detected duration (if available), output path preview, “Convert” button
  - Conversion state: progress bar, elapsed/remaining (best-effort), and **Cancel**
  - Completion: “Done” + buttons **Reveal in Finder / Explorer** and **Convert Another**
- **Error handling**
  - If input is unsupported or corrupted: show a friendly message and a “View Logs” link
  - If output exists: prompt **Overwrite** or **Choose different name**

### Functional requirements

- **FR1**: User can select a single input audio file.
- **FR2**: App converts the file to `.m4a` (AAC) and writes it to disk.
- **FR3**: App displays conversion progress (best-effort, but should be accurate for common files).
- **FR4**: User can cancel an in-progress conversion.
- **FR5**: App never deletes or modifies the input file.
- **FR6**: App is usable without installing external dependencies (FFmpeg is bundled).

### Output defaults (keep it simple)

- **Codec**: AAC-LC (`-c:a aac`)
- **Bitrate**: default **256 kbps** (`-b:a 256k`)
- **Container**: `.m4a`
- **Extra flags**
  - `-vn` (ignore any video streams)
  - `-movflags +faststart` (harmless for local playback, good default)

### File naming rules

- Default output path: same directory, same basename:
  - `My Recording.wav` → `My Recording.m4a`
- If output exists:
  - Prompt user: **Overwrite** or **Save as…**
  - (Optional later) auto-suffix: `My Recording (1).m4a`

### Technical approach (high-level architecture first)

- **Renderer (UI)**: shows controls/state; _never_ touches filesystem directly.
- **Preload**: exposes a minimal, typed API (`window.audioConverter.*`) to the renderer.
- **Main process**:
  - Owns file dialogs and path access
  - Runs and supervises conversion jobs
  - Sends progress/status events back to renderer
- **Conversion worker**: a small module in main process that spawns FFmpeg and parses progress.

### IPC contract (example)

These names are intentionally close to the current `window.audioConverter.*` API (preload bridge).

- `selectInputFile() -> { path, name } | null`
- `selectOutputFolder() -> { path } | null`
- `selectOutputFile(defaultPath: string) -> { path } | null`
- `suggestOutputPath(inputPath: string, outputFolderPath: string | null) -> string`
- `pathExists(targetPath: string) -> boolean`
- `startConversion({ inputPath, outputPath, bitrateKbps, overwrite }) -> { jobId }`
- `cancelConversion(jobId: string) -> void`
- `revealItemInFolder(targetPath: string) -> void`
- `revealLogs() -> void`
- Settings:
  - `getSettings() -> AppSettings`
  - `updateSettings(partial: Partial<AppSettings>) -> AppSettings`
- i18n:
  - `getI18n() -> { locale, translations }`
- Events emitted to renderer:
  - `conversionProgress({ jobId, percent, outTimeMs })`
  - `conversionDone({ jobId, outputPath })`
  - `conversionError({ jobId, message, code })`

### Conversion implementation details

- **Duration**: use **FFprobe** to read duration up-front (for progress %):
  - `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 <input>`
- **Conversion**: spawn FFmpeg with structured progress output:
  - Use `-progress pipe:2 -nostats` and parse key/value lines:
    - `out_time_us=...` / `out_time_ms=...`, `progress=continue|end`
    - Note: FFmpeg’s `-progress` keys aren’t perfectly consistent across builds. Some builds report `out_time_ms` in microseconds despite the name. Prefer `out_time_us` when present; otherwise treat `out_time_ms` as microseconds and normalize to milliseconds for UI/display.
  - Compute percent as `outTimeMs / (duration_s * 1000)`, clamp to 0..1
- **Cancel**:
  - Send `SIGTERM`, wait a short grace period, then `SIGKILL` if needed
  - Ensure partial output file is removed only if we can do so safely (best-effort)

### Self-contained FFmpeg strategy (packaging)

We will **bundle FFmpeg + FFprobe** with the app so end-users don’t install anything.

Current approach (implemented):

- Use `ffmpeg-static` + `ffprobe-static`.
- Configure packaging to **unpack** the binaries from ASAR so they remain executable at runtime.

Alternative (future, if we outgrow the static packages):

- Copy platform binaries into `resources/ffmpeg/` at build time and ship them via `extraResources` (electron-builder), outside ASAR.

Notes:

- **Licensing**: FFmpeg builds may be LGPL/GPL depending on configuration. We must:
  - Include required license notices in the app distribution
  - Ensure our chosen binaries’ license is compatible with how we ship/distribute the app

### Repo structure (current)

- `src/main/` — Electron main process (window + conversion orchestration)
- `src/preload/` — safe API bridge
- `src/renderer/` — UI
- `src/shared/` — shared types, validation
- `src/types/` — TypeScript module declarations for bundled binaries
- `resources/` — icons and other packaged resources

### Security posture (Electron hygiene)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (where feasible)
- Preload exposes **only** the methods we need; validate all IPC payloads
- Restrict navigation/new windows; disable `remote` module
- Add a strict Content Security Policy in renderer (no inline scripts)

### Observability + support (keep it lightweight)

- **Local logs** (e.g., `electron-log`)
  - Log start/end/error for each conversion with a stable job id
  - Provide a UI/menu item: **Help → Reveal Logs**
- **User-visible errors** are friendly; logs contain the real stack/ffmpeg stderr

### “Keep the project healthy” guardrails (what we’ll put in place early)

- **TypeScript** with `strict: true`
- **Lint + format**:
  - ESLint + Prettier (and consistent editor settings)
  - Pre-commit hook (optional) to prevent obviously broken commits
- **CI (GitHub Actions)**:
  - Install deps
  - Lint + typecheck
  - Unit tests
  - Build packaged artifacts (at least on main branch)
- **Tests (small but meaningful)**:
  - Unit tests for:
    - ffmpeg argument builder
    - progress parsing
    - output path rules / overwrite prompting logic
- **Dependency hygiene**:
  - Dependabot (or Renovate) for updates
  - Pin Node + package manager version (e.g., `engines` + `corepack`)
- **Release discipline**:
  - Semantic versioning
  - Simple changelog + tagged releases
  - Release checklist doc (signing/notarization can be a later milestone)

### Milestones (incremental, simple)

- **M1: Skeleton app**
  - Electron window + renderer UI
  - File picker, output picker, basic state machine
- **M2: Conversion engine**
  - FFprobe duration + FFmpeg spawn + progress + cancel
  - Handle overwrite prompt and common failures
- **M3: Self-contained packaging**
  - Bundle FFmpeg reliably for macOS (and set the pattern for Windows/Linux)
  - Verify conversion works in the packaged app, not just `npm run start`
- **M4: Project health**
  - CI, lint/typecheck, a handful of unit tests, logging + “Reveal Logs”

### Acceptance criteria (MVP)

- On a clean machine, user can:
  - Launch the app
  - Select a `.wav` file
  - Click Convert
  - See progress
  - Get a playable `.m4a` in the chosen output location
  - Cancel mid-way without the app hanging

### Open questions (decide before M2/M3)

- Target platforms for first release: **macOS only**, or macOS + Windows?
- Default bitrate: **256k** vs **192k** (smaller files) — UX tradeoff.
- Overwrite behavior: always prompt, or auto-suffix by default?
