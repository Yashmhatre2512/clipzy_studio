#!/usr/bin/env python3
"""
Start Lecture Highlight Generator — API on port 5001 + Next.js UI on port 3000.
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
    print("🎓 Starting Lecture Highlight Generator...")

    # ── Python (lectureGen venv) ──────────────────────────────────────────────
    venv_python = ROOT / "lectureGen" / "venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        python_exe = str(venv_python)
    else:
        python_exe = sys.executable
        print(f"⚠️  Warning: Virtual environment not found at {venv_python}, using system Python")

    lecture_dir = ROOT / "lectureGen"
    ui_dir       = ROOT / "ui"

    if not lecture_dir.exists():
        print(f"❌ Error: lectureGen directory not found at {lecture_dir}")
        return 1
    if not ui_dir.exists():
        print(f"❌ Error: ui directory not found at {ui_dir}")
        return 1

    print(f"\n✅ lectureGen directory : {lecture_dir}")
    print(f"✅ UI directory         : {ui_dir}")
    print(f"✅ Python               : {python_exe}")

    runtime_env = build_runtime_env()
    ffmpeg_path = runtime_env.get("FFMPEG_PATH")
    if ffmpeg_path:
        print(f"✅ FFmpeg               : {ffmpeg_path}")
    else:
        print("⚠️  FFmpeg not detected — clip generation may fail")

    # ── Start lectureGen API on port 5001 ─────────────────────────────────────
    print("\n⏳ Starting services...")
    print("\n🔵 Starting lectureGen API on port 5001 (background)...")
    try:
        api_process = subprocess.Popen(
            [python_exe, "app.py"],
            cwd=str(lecture_dir),
            env=runtime_env,
        )
        time.sleep(2)
        if api_process.poll() is not None:
            print("❌ lectureGen API failed to start. Check the output above for errors.")
            return 1
        print("✅ lectureGen API is running on http://localhost:5001")
    except Exception as e:
        print(f"❌ Failed to start lectureGen API: {e}")
        return 1

    # ── Start Next.js UI on port 3000 ─────────────────────────────────────────
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
    print("✅ UI running at         : http://localhost:3000")
    print("✅ Lecture API at        : http://localhost:5001")
    print("📖 Go to                 : http://localhost:3000/innerpage/lecture")
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
