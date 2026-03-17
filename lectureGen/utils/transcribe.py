import whisper
import logging

logger = logging.getLogger(__name__)


def transcribe_video(video_path: str) -> list:
    """Transcribe video/audio using Whisper and return timestamped segments."""
    logger.info(f"Loading Whisper model for: {video_path}")
    model = whisper.load_model("base")
    result = model.transcribe(video_path, fp16=False)
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "text": seg["text"].strip(),
            "start": float(seg["start"]),
            "end": float(seg["end"])
        })
    logger.info(f"Transcription complete: {len(segments)} segments")
    return segments
