#!/usr/bin/env python3
"""
Start all Clipzy Studio services:
  - shortGen  API  → port 5000  (Highlight Extractor)
  - lectureGen API → port 5001  (Lecture Highlights)
  - sportsGen  API → port 5002  (Sports Highlights)
  - hashtagGen API → port 5003  (Hashtag Recommender)
  - Next.js UI     → port 3000
"""
import os
import subprocess
import sys
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parent

# ── Service definitions ────────────────────────────────────────────────────────
SERVICES = [
    {"name": "shortGen",   "port": 5000, "folder": "shortGen"},
    {"name": "lectureGen", "port": 5001, "folder": "lectureGen"},
    {"name": "sportsGen",  "port": 5002, "folder": "sportsGen"},
    {"name": "hashtagGen", "port": 5003, "folder": "hashtagGen"},
]


def build_runtime_env() -> dict:
    env = os.environ.copy()
    ffmpeg_matches = sorted(ROOT.glob("ffmpeg-*-essentials_build/bin/ffmpeg.exe"))
    if ffmpeg_matches:
        ffmpeg_bin = ffmpeg_matches[-1].parent
        env["PATH"] = f"{ffmpeg_bin}{os.pathsep}{env.get('PATH', '')}"
        env.setdefault("FFMPEG_PATH", str(ffmpeg_matches[-1]))
    return env


def get_venv_python(folder: str) -> str:
    venv_python = ROOT / folder / "venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    print(f"⚠️  Warning: venv not found for {folder} — run: python install.py")
    return sys.executable


def start_api(service: dict, runtime_env: dict):
    """Start a backend API process and return it, or None on failure."""
    name   = service["name"]
    port   = service["port"]
    folder = service["folder"]
    svc_dir = ROOT / folder

    if not svc_dir.exists():
        print(f"⚠️  {name} directory not found — skipping")
        return None

    python_exe = get_venv_python(folder)
    print(f"\n🔵 Starting {name} API on port {port}...")

    try:
        proc = subprocess.Popen(
            [python_exe, "app.py"],
            cwd=str(svc_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            env=runtime_env,
        )
        time.sleep(2)
        if proc.poll() is not None:
            print(f"❌ {name} failed to start. Output:")
            for line in proc.stdout:
                print(f"    {line}", end='')
            return None
        print(f"✅ {name} running on http://localhost:{port}")
        return proc
    except Exception as e:
        print(f"❌ Failed to start {name}: {e}")
        return None


def main():
    print("🚀 Starting Clipzy Studio — All Services...")

    ui_dir = ROOT / "ui"
    if not ui_dir.exists():
        print(f"❌ Error: ui directory not found at {ui_dir}")
        return 1

    runtime_env = build_runtime_env()
    ffmpeg_path = runtime_env.get("FFMPEG_PATH")
    if ffmpeg_path:
        print(f"✅ FFmpeg: {ffmpeg_path}")
    else:
        print("⚠️  FFmpeg not detected — clip generation may fail")

    # ── Start all backend APIs ─────────────────────────────────────────────────
    print("\n⏳ Starting backend APIs...")
    processes = []
    for svc in SERVICES:
        proc = start_api(svc, runtime_env)
        if proc:
            processes.append((svc["name"], proc))

    if not processes:
        print("❌ No backend APIs started successfully. Aborting.")
        return 1

    # ── Start Next.js UI ───────────────────────────────────────────────────────
    print("\n🔵 Starting UI on port 3000...")
    try:
        ui_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(ui_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            shell=True,
            bufsize=1,
            env=runtime_env,
        )
        print("✅ UI started\n")
    except Exception as e:
        print(f"❌ Failed to start UI: {e}")
        for _, proc in processes:
            proc.terminate()
        return 1

    print("=" * 60)
    print("✅ UI                 : http://localhost:3000")
    print("✅ shortGen  (port 5000) : http://localhost:3000")
    print("✅ lectureGen (port 5001) : http://localhost:3000/innerpage/lecture")
    print("✅ sportsGen  (port 5002) : http://localhost:3000/innerpage/sports")
    print("✅ hashtagGen (port 5003) : http://localhost:3000/innerpage/hashtag")
    print("=" * 60)
    print("Press Ctrl+C to stop all services.\n")

    # ── Stream UI output; stop all on Ctrl+C ──────────────────────────────────
    try:
        for line in ui_process.stdout:
            print(line, end='')
        ui_process.wait()
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping all services...")
        ui_process.terminate()
        for _, proc in processes:
            proc.terminate()
        time.sleep(1)
        ui_process.kill()
        for _, proc in processes:
            proc.kill()

    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopped by user")
        sys.exit(0)
