## Third-party notices

This app depends on the following key third-party components. This document is meant to ship with release artifacts so the project’s licensing obligations are easy to satisfy.

- **FFmpeg binaries** (via `ffmpeg-static` and `ffprobe-static`)
  - These packages ship prebuilt FFmpeg/FFprobe executables for supported platforms.
  - **Important**: FFmpeg’s license depends on how the binaries were built (LGPL vs GPL). Before distributing builds, confirm the license terms for the exact binaries you ship and include any required attribution and license texts.

- **electron-log**
  - Used for local app logs (helps debug conversion failures).

For a complete dependency list, see `package.json`. If you add or remove major dependencies (especially anything that ships native binaries), update this file accordingly.
