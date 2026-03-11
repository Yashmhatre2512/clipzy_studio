# MajorProject AI

AI-powered short video generation and highlight extraction system.

## Quick Start

### 1. Install Dependencies (First Time Only)

```powershell
cd "c:\Users\YASH\college\B.E\Major project\majotproject_AI"
python install.py
```

This will:
- Download and extract FFmpeg automatically on Windows if it is missing
- Create virtual environments for all Python services
- Install Python dependencies from `requirements.txt`
- Install npm dependencies for the UI

### 2. Start Everything with One Command

```powershell
cd "c:\Users\YASH\college\B.E\Major project\majotproject_AI"
python start_ui_highlight.py
```

This starts:
- **UI (Frontend)**: `http://localhost:3000`
- **shortGen API (Highlight Extractor)**: `http://localhost:5000`

Press `Ctrl+C` in the terminal to stop both services.

## Services

| Service | Port | Purpose |
|---------|------|---------|
| UI (Next.js) | 3000 | Web interface for video upload & highlight extraction |
| shortGen API (Flask) | 5000 | Highlight extraction & video processing |

## Features

- 📤 Upload videos for highlight extraction
- ⚡ AI-powered scene detection and scoring
- 📝 Automatic transcription and captions
- 🎬 Generate short video clips from long videos
- 📊 Track job progress in real-time

## Project Structure

```
majotproject_AI/
├── ui/                     # Next.js frontend
├── shortGen/               # Flask highlight extraction API
├── aivideogen/             # AI video generation (optional)
├── aizoom/                 # Video zoom tracking (optional)
├── install.py              # Setup script for all services
└── start_ui_highlight.py   # Start UI + shortGen in one command
```

## Environment Setup

The UI automatically connects to the API on `http://localhost:5000` via the `.env.local` file:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## Troubleshooting

- **Port already in use?** Change the port in the service's app configuration
- **npm not found?** Ensure Node.js is installed and in PATH
- **Python venv issues?** Delete the `venv` folders and re-run `install.py`
- **FFmpeg download failed?** Check your internet connection and re-run `install.py`

## Notes

- Services run in the foreground; logs display in the terminal
- Stop services with `Ctrl+C`
- Ensure Python 3.8+ is installed
