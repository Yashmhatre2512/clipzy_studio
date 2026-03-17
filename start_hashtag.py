#!/usr/bin/env python3
"""Start Hashtag Recommender — API on port 5003 + Next.js UI on port 3000."""
import os, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    print("# Starting Hashtag Recommender...")

    venv_python = ROOT / "hashtagGen" / "venv" / "Scripts" / "python.exe"
    python_exe  = str(venv_python) if venv_python.exists() else sys.executable
    if not venv_python.exists():
        print(f"Warning: venv not found — run: python install.py")

    hashtag_dir = ROOT / "hashtagGen"
    ui_dir      = ROOT / "ui"

    env = os.environ.copy()
    print(f"Python : {python_exe}")

    print("\nStarting hashtagGen API on port 5003...")
    try:
        api = subprocess.Popen([python_exe, "app.py"], cwd=str(hashtag_dir), env=env)
        time.sleep(2)
        if api.poll() is not None:
            print("hashtagGen API failed to start.")
            return 1
        print("hashtagGen API running on http://localhost:5003")
    except Exception as e:
        print(f"Failed: {e}"); return 1

    print("\nStarting UI on port 3000...")
    ui = subprocess.Popen(
        ["npm", "run", "dev"], cwd=str(ui_dir),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        universal_newlines=True, shell=True, bufsize=1, env=env,
    )

    print("\n" + "=" * 55)
    print("UI              : http://localhost:3000")
    print("Hashtag API     : http://localhost:5003")
    print("Go to           : http://localhost:3000/innerpage/hashtag")
    print("=" * 55 + "\n")

    try:
        for line in ui.stdout:
            print(line, end='')
    except KeyboardInterrupt:
        print("\nStopping...")
        api.terminate(); ui.terminate()
        time.sleep(1); api.kill(); ui.kill()

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nStopped."); sys.exit(0)
