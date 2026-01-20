## Third-party notices (initial)

This app depends on the following key third-party components:

- **FFmpeg binaries** (via `ffmpeg-static` and `ffprobe-static`)
  - These packages ship prebuilt FFmpeg/FFprobe executables for supported platforms.
  - **Important**: FFmpeg’s license depends on how the binary was built (LGPL vs GPL). Before distributing builds, confirm the license terms for the exact binaries used and include the required notices.

- **electron-log**
  - Used for local app logs (helps debug conversion failures).

If you add/remove major dependencies, update this file accordingly.
