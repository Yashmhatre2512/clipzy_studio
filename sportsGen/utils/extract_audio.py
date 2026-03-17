import subprocess
import logging

logger = logging.getLogger(__name__)


def extract_audio(video_path: str, audio_path: str):
    """Extract mono 22050Hz WAV from video using ffmpeg."""
    logger.info(f"Extracting audio → {audio_path}")
    cmd = [
        'ffmpeg', '-y',
        '-i', video_path,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '22050',
        '-ac', '1',
        audio_path
    ]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=600)
