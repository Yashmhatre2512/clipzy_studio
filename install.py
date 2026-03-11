import os
import subprocess
import sys
from pathlib import Path

# Backends to prepare
BACKENDS = [
    {"folder": "aivideogen", "req": "requirements.txt"},
    {"folder": "aizoom",     "req": "requirements.txt"},
    {"folder": "shortGen",   "req": "requirements.txt"},
]
FRONTEND_DIR = "ui"

def info(msg):  print(f"[INFO]    {msg}")
def warn(msg):  print(f"[WARN]    {msg}")
def error(msg): print(f"[ERROR]   {msg}")

def ensure_venv(proj: Path) -> Path:
    """Create venv if missing and return the venv's python, else fallback to system."""
    venv_dir = proj / "venv"
    python_bin = venv_dir / ("Scripts/python.exe" if os.name=="nt" else "bin/python")

    if not venv_dir.exists():
        info(f"Creating virtualenv in {proj}/venv …")
        try:
            subprocess.check_call([sys.executable, "-m", "venv", str(venv_dir)])
        except subprocess.CalledProcessError:
            warn(f"Could not create venv for {proj}; will use system Python")

    if python_bin.exists():
        return python_bin

    warn(f"No venv python for {proj}, falling back to system Python")
    return Path(sys.executable)

def install_requirements(python_exe: Path, proj: Path, req_file: str):
    path = proj / req_file
    if path.exists():
        info(f"Installing {proj.name}/{req_file} …")
        subprocess.check_call([str(python_exe), "-m", "pip", "install", "-r", str(path)])
    else:
        warn(f"{req_file} not found in {proj.name}, skipping")

def install_frontend_dependencies():
    ui = Path(FRONTEND_DIR)
    if not ui.exists():
        warn(f"Frontend folder '{FRONTEND_DIR}' not found, skipping npm install")
        return

    info("Installing npm dependencies in ui/ …")
    subprocess.check_call(["npm", "install" , "--force"], cwd=str(ui))

def main():
    print("\n=== Setting up Python Backends ===")
    for b in BACKENDS:
        proj = Path(b["folder"])
        if not proj.exists():
            warn(f"Backend folder '{b['folder']}' missing, skipping")
            continue
        py = ensure_venv(proj)
        install_requirements(py, proj, b["req"])

    print("\n=== Setting up Frontend ===")
    install_frontend_dependencies()

    print("\n✅ All environments are prepared.")

if __name__ == "__main__":
    main()
