# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Butterfly Radio is a fully local, private AI-powered live radio desktop application. It generates AI host commentary between songs using LLM + TTS, supports user interaction (song requests, chat), and runs entirely offline with no cloud dependency required. The design document is at `Butterfly Radio 本地私有化AI电台 全栈开发与部署文档.md`.

## Architecture

**Electron desktop frontend + pure Python backend (single process)**

The backend is a monolithic FastAPI application containing all business logic, AI inference, audio processing, and real-time communication — no cross-language or cross-service calls.

```
Electron Renderer (React)  →  Socket.IO  →  Python Backend (FastAPI)
                                              ├── Business APIs
                                              ├── AI modules (LLM, TTS, content safety)
                                              ├── Live broadcast scheduler (APScheduler)
                                              ├── Audio processing (pydub + ffmpeg)
                                              ├── Real-time comm (python-socketio)
                                              └── SQLite via SQLAlchemy + aiosqlite
```

The Electron main process manages the Python backend lifecycle (start/stop/restart), window management, and IPC via preload scripts.

## Planned Directory Structure

```
butterfly-radio-local/
├── electron-main/        # Electron main process, window mgmt, Python process lifecycle
├── frontend/             # React + TypeScript UI
│   ├── components/       # UI components
│   ├── store/            # Zustand state management
│   ├── socket/           # Socket.IO client wrapper
│   └── player/           # Howler.js audio player + Web Audio API visualization
├── python-backend/
│   ├── api/              # FastAPI route handlers (live, playlist, user, system)
│   ├── core/             # Broadcast scheduler, realtime comm, audio engine, task scheduler
│   ├── ai/               # LLM engine, TTS engine, content safety
│   ├── db/               # SQLAlchemy models, data access, local config
│   ├── service/          # Business logic (playlist, user, interaction, system)
│   ├── utils/            # Shared utilities
│   └── main.py           # Application entry point
├── resources/
│   ├── models/           # AI model files
│   ├── default-music/    # Built-in music library
│   ├── assets/           # Images, icons, themes
│   └── ffmpeg/           # Bundled FFmpeg binaries
└── build/                # Electron-builder + PyInstaller packaging configs
```

## Tech Stack

**Frontend:**
- React 18.3 + TypeScript 5.4
- Tailwind CSS 3.4 + shadcn/ui (dark cyberpunk theme)
- Socket.IO 4.7 client (real-time backend communication)
- Howler.js 2.2 + Web Audio API (audio playback + spectrum visualization)
- Electron 30.0 + electron-builder 24.13
- Zustand 4.5 (state management)

**Backend (Python 3.11):**
- FastAPI 0.115.0 (async web framework)
- python-socketio 5.11.0 (WebSocket server, compatible with Socket.IO client)
- SQLAlchemy 2.0 + aiosqlite 0.20.0 (async SQLite ORM)
- APScheduler 4.0.0 (broadcast timeline scheduling)
- pydub 0.25.1 + ffmpeg-python 0.2.0 (audio mixing/processing)
- aiofiles 24.1.0 (async file I/O)
- Pydantic 2.9.0 (validation)

**AI Models (3 tiers):**
- Lightweight (CPU only): Qwen 3.5 1.8B 4bit + ChatTTS lightweight
- High quality (GPU): Qwen 3.5 7B 4bit + Qwen3-TTS 1.2B 4bit
- Cloud API fallback: Volcengine Doubao / Alibaba Qwen APIs

## Key Technical Decisions

- **Single-process Python backend**: All services (API, AI, audio, scheduling) run in one FastAPI process. No microservices.
- **Server-authoritative playback**: Python backend owns the broadcast timeline via APScheduler. Frontend syncs playback position over Socket.IO with <100ms latency.
- **Audio mixing**: pydub + FFmpeg merges TTS audio with songs at gaps for seamless broadcast transitions.
- **SQLite for storage**: Single-file database, no external DB service needed.
- **Three AI tiers**: Lightweight (8GB RAM, CPU), High quality (16GB RAM + 4GB VRAM), Cloud API (no hardware requirements).
- **Packaging**: PyInstaller bundles Python backend into a single executable, then electron-builder wraps everything (frontend + backend + models + FFmpeg) into a desktop installer.

## Development Commands

Since the project is in planning phase, these are the expected commands based on the architecture:

```bash
# Frontend (run from frontend/)
pnpm install
pnpm dev                    # Dev server
pnpm build                  # Production build for Electron

# Python backend (run from python-backend/)
pip install -r requirements.txt  # or: poetry install
python main.py              # Start FastAPI server (default port 3000)

# Electron (run from electron-main/)
npm install
npm run dev                 # Electron dev mode
npm run build               # Package desktop app via electron-builder

# Python backend packaging (run from project root)
pyinstaller build/pyinstaller.spec   # Bundle backend into single executable
```

## Important Notes

- Default backend port is 3000 — check for conflicts before starting.
- FFmpeg must be available (either in system PATH or bundled in `resources/ffmpeg/`).
- Supported audio formats: MP3, WAV, FLAC, AAC.
- The app is designed for single-user local use; all data stays on disk, no auth system needed.
- AI model files go in `resources/models/` — see the design doc appendix for download links.
