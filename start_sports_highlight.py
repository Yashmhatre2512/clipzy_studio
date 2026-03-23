#!/usr/bin/env python3
"""
Start Large Video Sports Highlight Generator — API on port 5003 + Next.js UI on port 3000.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def build_runtime_env() -> dict:
    env = os.environ.copy()
    ffmpeg_matches = sorted(ROOT.glob("ffmpeg-*-essentials_build/bin/ffmpeg.exe"))
    if ffmpeg_matches:
        ffmpeg_bin = ffmpeg_matches[-1].parent
        env["PATH"] = f"{ffmpeg_bin}{os.pathsep}{env.get('PATH', '')}"
        env.setdefault("FFMPEG_PATH", str(ffmpeg_matches[-1]))
    return env


def main():
    print("🏟️  Starting Large Video Sports Highlight Generator...")

    venv_python = ROOT / "sportsHighlight" / "venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        python_exe = str(venv_python)
    else:
        python_exe = sys.executable
        print(f"⚠️  Warning: Virtual environment not found at {venv_python}")
        print("    Run: python -m venv sportsHighlight/venv && sportsHighlight/venv/Scripts/pip install -r sportsHighlight/requirements.txt")

    highlight_dir = ROOT / "sportsHighlight"
    ui_dir        = ROOT / "ui"

    if not highlight_dir.exists():
        print(f"❌ Error: sportsHighlight directory not found at {highlight_dir}")
        return 1
    if not ui_dir.exists():
        print(f"❌ Error: ui directory not found at {ui_dir}")
        return 1

    print(f"\n✅ sportsHighlight dir : {highlight_dir}")
    print(f"✅ UI directory        : {ui_dir}")
    print(f"✅ Python              : {python_exe}")

    runtime_env = build_runtime_env()
    ffmpeg_path = runtime_env.get("FFMPEG_PATH")
    if ffmpeg_path:
        print(f"✅ FFmpeg              : {ffmpeg_path}")
    else:
        print("⚠️  FFmpeg not detected — clip generation may fail")

    print("\n⏳ Starting services...")
    print("\n🔵 Starting sportsHighlight API on port 5003 (background)...")
    try:
        api_process = subprocess.Popen(
            [python_exe, "app.py"],
            cwd=str(highlight_dir),
            env=runtime_env,
        )
        time.sleep(2)
        if api_process.poll() is not None:
            print("❌ sportsHighlight API failed to start. Check the output above for errors.")
            return 1
        print("✅ sportsHighlight API is running on http://localhost:5003")
    except Exception as e:
        print(f"❌ Failed to start sportsHighlight API: {e}")
        return 1

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
        api_process.terminate()
        return 1

    print("=" * 60)
    print("✅ UI running at        : http://localhost:3000")
    print("✅ Highlight API at     : http://localhost:5003")
    print("🏆 Go to               : http://localhost:3000/innerpage/sports-highlight")
    print("=" * 60 + "\n")

    try:
        for line in ui_process.stdout:
            print(line, end='')
        ui_process.wait()
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping services...")
        api_process.terminate()
        ui_process.terminate()
        time.sleep(1)
        api_process.kill()
        ui_process.kill()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopped by user")
        sys.exit(0)
