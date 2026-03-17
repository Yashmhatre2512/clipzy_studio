# Clipzy Studio

An all-in-one AI-powered video processing platform featuring intelligent highlight extraction, sports moment detection, hashtag recommendations, and 15+ professional video editing tools — running fully on-device with no cloud AI API dependencies.

---

## Features

| Feature | Description |
|---|---|
| **Lecture / Podcast Highlights** | Extracts key moments using Whisper transcription, 9-signal scoring, Graph + PageRank + MMR selection |
| **Sports Highlights** | Detects exciting moments using audio energy analysis (RMS + high-frequency band) |
| **Hashtag Recommender** | Generates smart hashtags using Whisper + TF-IDF keyword extraction |
| **Video Tools** | 15+ tools: Trim, Merge, Split, Compress, Resize, Extract Audio, Watermark, Change Format, Rotate, and more |

---

## Quick Start

### 1. Install Dependencies (First Time Only)

```bash
python install.py
```

This will:
- Download and extract FFmpeg automatically on Windows
- Create virtual environments for all Python services
- Install Python dependencies from each `requirements.txt`
- Install npm dependencies for the UI

### 2. Start Everything with One Command

```bash
python start_ui_highlight.py
```

All services start automatically:

| Service | URL |
|---|---|
| UI (Next.js) | http://localhost:3000 |
| shortGen API | http://localhost:5000 |
| lectureGen API | http://localhost:5001 |
| sportsGen API | http://localhost:5002 |
| hashtagGen API | http://localhost:5003 |

Press `Ctrl+C` to stop all services.

---

## Project Structure

```
clipzy_studio/
├── ui/                     # Next.js 14 frontend (TypeScript + Tailwind CSS)
├── shortGen/               # Flask API — Video tools & processing
├── lectureGen/             # Flask API — Lecture highlight extraction
│   └── utils/
│       ├── chunk_and_filter.py   # 9-signal importance scoring
│       ├── gpt_highlight.py      # Graph + PageRank + MMR selection
│       ├── transcribe.py         # Whisper transcription
│       └── process_lecture.py    # Pipeline orchestrator
├── sportsGen/              # Flask API — Sports highlight detection
│   └── utils/
│       ├── detect_moments.py     # Audio energy peak detection
│       ├── extract_audio.py      # FFmpeg audio extraction
│       └── process_sports.py    # Pipeline orchestrator
├── hashtagGen/             # Flask API — Hashtag recommendation
├── install.py              # One-time setup script
├── start_ui_highlight.py   # Single launcher for all services
├── start_lecture.py        # Launch lectureGen only
├── start_sports.py         # Launch sportsGen only
└── start_hashtag.py        # Launch hashtagGen only
```

---

## How It Works

### Lecture Highlights Pipeline
1. **Audio Extraction** — FFmpeg extracts WAV audio from video
2. **Transcription** — OpenAI Whisper (on-device) generates timestamped segments
3. **Chunking** — Sliding window chunks with 50% overlap
4. **Multi-Signal Scoring** — 9 signals: TF-IDF, Embedding Similarity, Keywords, Discourse Patterns, Position, Lexical Diversity, Technical Density, Sentence Clarity, Q&A Detection
5. **Graph + PageRank** — Multi-signal similarity graph with weighted PageRank (damping=0.85)
6. **MMR Selection** — Maximal Marginal Relevance (λ=0.65) for diverse highlight selection
7. **Clip Generation** — FFmpeg slices clips snapped to Whisper segment boundaries

### Sports Highlights Pipeline
1. **Audio Extraction** — FFmpeg extracts WAV audio
2. **Energy Analysis** — RMS energy (55%) + High-frequency band 1–8 kHz (45%) via librosa
3. **Smoothing** — 1.5s moving average to merge nearby spikes
4. **Peak Detection** — scipy find_peaks on top 20% energy moments
5. **Boundary Detection** — Threshold-based start/end search with 1.5s/2.5s buffers
6. **Clip Generation** — FFmpeg slices clips sorted by energy score

---

## Requirements

- Python 3.8+
- Node.js 18+
- ~4 GB RAM (for Whisper transcription)
- FFmpeg (auto-downloaded by `install.py`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Python, Flask, Flask-CORS |
| Speech Recognition | OpenAI Whisper (local) |
| Audio Analysis | librosa, scipy, numpy |
| NLP / ML | scikit-learn (TF-IDF), sentence-transformers |
| Video Processing | FFmpeg (libx264 + AAC) |

---

## Troubleshooting

- **Port in use?** — Kill the process on that port or change port in `app.py`
- **Whisper slow?** — Use `model="base"` instead of `"small"` in `transcribe.py`
- **venv issues?** — Delete `venv/` folders and re-run `install.py`
- **FFmpeg not found?** — Re-run `install.py` to auto-download
