#!/usr/bin/env python3
"""
Start UI (Next.js) and shortGen API (Flask) in one command.
"""
import os
import subprocess
import sys
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parent

def run_command(name: str, cmd: list, cwd: Path):
    """Run a command and print output in real-time."""
    print(f"\n{'='*60}")
    print(f"[{name}] Starting: {' '.join(cmd)}")
    print(f"[{name}] Working directory: {cwd}")
    print(f"{'='*60}\n")
    
    try:
        process = subprocess.Popen(
            cmd,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Print output as it comes
        for line in process.stdout:
            print(f"[{name}] {line}", end='')
        
        process.wait()
        return process.returncode
    except Exception as e:
        print(f"[{name}] Error: {e}")
        return 1


def main():
    print("🚀 Starting UI + Highlight Extractor...")
    
    # Always use the venv Python to ensure packages are available
    venv_python = ROOT / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        python_exe = str(venv_python)
    else:
        python_exe = sys.executable
        print(f"⚠️  Warning: Virtual environment not found at {venv_python}, using system Python")
    
    # Resolve npm/node
    shortgen_dir = ROOT / "shortGen"
    ui_dir = ROOT / "ui"
    
    # Check if directories exist
    if not shortgen_dir.exists():
        print(f"❌ Error: shortGen directory not found at {shortgen_dir}")
        return 1
    if not ui_dir.exists():
        print(f"❌ Error: ui directory not found at {ui_dir}")
        return 1
    
    print(f"\n✅ shortGen directory: {shortgen_dir}")
    print(f"✅ UI directory: {ui_dir}")
    print(f"✅ Python: {python_exe}")
    
    # Start both services in background
    print("\n⏳ Starting services...")
    
    print("\n🔵 Starting shortGen API on port 5000 (background)...")
    try:
        shortgen_process = subprocess.Popen(
            [python_exe, "app.py"],
            cwd=str(shortgen_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        print("✅ shortGen starting...")
        
        # Check if it started successfully by waiting a bit and reading initial output
        time.sleep(2)
        if shortgen_process.poll() is not None:
            # Process has already exited - something went wrong
            print("❌ shortGen failed to start. Output:")
            for line in shortgen_process.stdout:
                print(f"    {line}", end='')
            return 1
        else:
            print("✅ shortGen is running")
        
        time.sleep(1)  # Give API time to fully start
    except Exception as e:
        print(f"❌ Failed to start shortGen: {e}")
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
            bufsize=1
        )
        print("✅ UI started\n")
    except Exception as e:
        print(f"❌ Failed to start UI: {e}")
        if shortgen_process:
            shortgen_process.terminate()
        return 1
    
    print("="*60)
    print("✅ UI running at: http://localhost:3000")
    print("✅ API running at: http://localhost:5000 (background)")
    print("="*60 + "\n")
    
    # Keep running until interrupted
    try:
        # Stream UI output to terminal
        for line in ui_process.stdout:
            print(line, end='')
        ui_process.wait()
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping services...")
        shortgen_process.terminate()
        ui_process.terminate()
        time.sleep(1)
        shortgen_process.kill()
        ui_process.kill()
    
    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopped by user")
        sys.exit(0)
