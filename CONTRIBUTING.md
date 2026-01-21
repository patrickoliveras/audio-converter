# Contributing

Thanks for helping improve Waveshift. This repo is intentionally small; changes that reduce complexity and keep the UI straightforward are preferred.

## Setup

- Node.js **20+**

```bash
npm ci
```

## Dev loop

```bash
npm run start
```

Note: `start` runs a build before launching Electron. If you’re iterating on build-only changes (e.g., TypeScript errors), `npm run build` is usually faster.

## Icons (required for packaging)

`electron-builder` expects platform icon files that are generated from `resources/icon.svg`. These generated files are intentionally ignored by `.gitignore` (they’re machine-generated), but they must exist locally for packaging.

Before running any packaging/release scripts, generate icons once on your machine:

```bash
npm run icons
```

## Quality checks

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run build
```

## Building distributables

```bash
npm run dist
```

macOS ZIP (recommended for sharing):

```bash
npm run release:zip
```
