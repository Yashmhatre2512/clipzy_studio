import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path
from typing import Optional

# Backends to prepare
BACKENDS = [
    {"folder": "aivideogen",  "req": "requirements.txt"},
    {"folder": "aizoom",      "req": "requirements.txt"},
    {"folder": "shortGen",    "req": "requirements.txt"},
    {"folder": "lectureGen",  "req": "requirements.txt"},
    {"folder": "sportsGen",   "req": "requirements.txt"},
    {"folder": "hashtagGen",  "req": "requirements.txt"},
]
FRONTEND_DIR = "ui"
ROOT = Path(__file__).resolve().parent
FFMPEG_DOWNLOAD_URL = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
FFMPEG_ZIP_PATH = ROOT / "ffmpeg.zip"

def info(msg):  print(f"[INFO]    {msg}")
def warn(msg):  print(f"[WARN]    {msg}")
def error(msg): print(f"[ERROR]   {msg}")

COMPATIBLE_PYTHON_VERSIONS = ["3.12", "3.11", "3.10", "3.9"]

def find_compatible_python() -> str:
    """Find a Python interpreter compatible with the packages (3.9–3.12)."""
    import platform
    cur_ver = platform.python_version_tuple()
    cur_minor = int(cur_ver[1])
    if cur_ver[0] == "3" and 9 <= cur_minor <= 12:
        return sys.executable  # current Python is already compatible

    # Try py launcher (Windows) first
    if os.name == "nt":
        for ver in COMPATIBLE_PYTHON_VERSIONS:
            try:
                result = subprocess.run(
                    ["py", f"-{ver}", "-c", "import sys; print(sys.executable)"],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    exe = result.stdout.strip()
                    info(f"Using Python {ver} from py launcher: {exe}")
                    return exe
            except FileNotFoundError:
                break

    # Try python3.X commands
    for ver in COMPATIBLE_PYTHON_VERSIONS:
        cmd = f"python{ver}" if os.name != "nt" else f"python{ver}"
        try:
            result = subprocess.run(
                [cmd, "-c", "import sys; print(sys.executable)"],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                exe = result.stdout.strip()
                info(f"Found compatible Python at: {exe}")
                return exe
        except FileNotFoundError:
            continue

    warn(f"No compatible Python (3.9–3.12) found; using system Python {sys.version.split()[0]} — some packages may fail to install")
    return sys.executable

def ensure_venv(proj: Path) -> Path:
    """Create venv if missing and return the venv's python, else fallback to system."""
    venv_dir = proj / "venv"
    python_bin = venv_dir / ("Scripts/python.exe" if os.name=="nt" else "bin/python")

    if not venv_dir.exists():
        info(f"Creating virtualenv in {proj}/venv …")
        try:
            py = find_compatible_python()
            subprocess.check_call([py, "-m", "venv", str(venv_dir)])
        except subprocess.CalledProcessError:
            warn(f"Could not create venv for {proj}; will use system Python")

    if python_bin.exists():
        return python_bin

    warn(f"No venv python for {proj}, falling back to system Python")
    return Path(sys.executable)

def install_requirements(python_exe: Path, proj: Path, req_file: str):
    path = proj / req_file
    if path.exists():
        info(f"Upgrading pip + setuptools for {proj.name} …")
        subprocess.check_call([str(python_exe), "-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools==69.5.1"])
        info(f"Installing {proj.name}/{req_file} …")
        subprocess.check_call([str(python_exe), "-m", "pip", "install", "--no-build-isolation", "-r", str(path)])
    else:
        warn(f"{req_file} not found in {proj.name}, skipping")

def install_frontend_dependencies():
    ui = Path(FRONTEND_DIR)
    if not ui.exists():
        warn(f"Frontend folder '{FRONTEND_DIR}' not found, skipping npm install")
        return

    info("Installing npm dependencies in ui/ …")
    subprocess.check_call(["npm", "install", "--force"], cwd=str(ui), shell=(os.name == "nt"))

def find_local_ffmpeg_bin() -> Optional[Path]:
    matches = sorted(ROOT.glob("ffmpeg-*-essentials_build/bin/ffmpeg.exe"))
    if matches:
        return matches[-1].parent
    return None

def ensure_ffmpeg():
    if os.name != "nt":
        if shutil.which("ffmpeg"):
            info("FFmpeg already available in PATH")
        else:
            warn("FFmpeg auto-download is only configured for Windows; install FFmpeg manually on this OS")
        return

    path_ffmpeg = shutil.which("ffmpeg")
    if path_ffmpeg:
        info(f"FFmpeg already available: {path_ffmpeg}")
        return

    local_bin = find_local_ffmpeg_bin()
    if local_bin:
        os.environ["PATH"] = f"{local_bin}{os.pathsep}{os.environ.get('PATH', '')}"
        info(f"Using existing local FFmpeg in {local_bin}")
        return

    info("FFmpeg not found. Downloading Windows build …")
    try:
        urllib.request.urlretrieve(FFMPEG_DOWNLOAD_URL, FFMPEG_ZIP_PATH)
        info("Extracting FFmpeg …")
        with zipfile.ZipFile(FFMPEG_ZIP_PATH, "r") as archive:
            archive.extractall(ROOT)
    except Exception as exc:
        raise RuntimeError(f"Failed to download or extract FFmpeg: {exc}") from exc
    finally:
        if FFMPEG_ZIP_PATH.exists():
            FFMPEG_ZIP_PATH.unlink(missing_ok=True)

    local_bin = find_local_ffmpeg_bin()
    if not local_bin:
        raise RuntimeError("FFmpeg archive was extracted, but ffmpeg.exe was not found")

    os.environ["PATH"] = f"{local_bin}{os.pathsep}{os.environ.get('PATH', '')}"
    info(f"FFmpeg installed locally in {local_bin}")

def main():
    print("\n=== Checking FFmpeg ===")
    ensure_ffmpeg()

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
