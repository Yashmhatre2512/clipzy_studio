import os
import json
import subprocess
import logging

from utils.extract_audio import extract_audio
from utils.detect_moments import detect_exciting_moments
import config.config as config

logger = logging.getLogger(__name__)


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def clip_segment(video_path: str, start: float, end: float, output_path: str):
    duration = max(1.0, end - start)
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start),
        '-i', video_path,
        '-t', str(duration),
        '-c:v', 'libx264', '-c:a', 'aac',
        '-avoid_negative_ts', 'make_zero',
        '-reset_timestamps', '1',
        '-movflags', '+faststart',
        output_path
    ]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)


def process_sports(video_path, jobs, job_id, num_clips=5, clip_duration=30):
    """
    Full pipeline:
      1. Extract audio (ffmpeg → WAV)
      2. Detect exciting moments via audio energy analysis
      3. Select top N moments sorted by energy (highest = most exciting)
      4. Extend each moment if shorter than requested clip_duration (never shrink)
      5. Generate clips with ffmpeg
    """
    try:
        job_folder = os.path.join(config.RESULTS_FOLDER, job_id)
        os.makedirs(job_folder, exist_ok=True)

        jobs[job_id]['status'] = 'processing'
        jobs[job_id]['progress'] = 5

        # ── Step 1: Extract audio ─────────────────────────────────────────────
        logger.info(f"[{job_id}] Extracting audio...")
        audio_path = os.path.join(job_folder, 'audio.wav')
        extract_audio(video_path, audio_path)
        jobs[job_id]['progress'] = 20

        # ── Step 2: Detect moments ────────────────────────────────────────────
        logger.info(f"[{job_id}] Detecting exciting moments...")
        jobs[job_id]['progress'] = 25
        # Minimum gap between moments = half the clip duration (at least 5s)
        min_gap = max(5.0, clip_duration * 0.5)
        moments = detect_exciting_moments(audio_path, min_gap_sec=min_gap)
        jobs[job_id]['progress'] = 60

        if not moments:
            raise RuntimeError("No exciting moments detected in the audio. Try a different video.")

        # ── Step 3: Select top N ──────────────────────────────────────────────
        selected = moments[:num_clips]

        # Extend moment duration if shorter than what the user requested.
        # Never shorten — the complete moment is more important.
        for m in selected:
            natural_dur = m['end'] - m['start']
            if natural_dur < clip_duration:
                shortfall = clip_duration - natural_dur
                # Expand backwards first (to capture buildup), then forwards
                extra_before = min(shortfall * 0.4, m['start'])
                extra_after  = shortfall - extra_before
                m['start'] = max(0.0, m['start'] - extra_before)
                m['end']   = m['end'] + extra_after

        # ── Step 4: Generate clips ────────────────────────────────────────────
        logger.info(f"[{job_id}] Generating {len(selected)} clips...")
        metadata = []
        for i, moment in enumerate(selected):
            clip_name   = f"clip_{i + 1}.mp4"
            output_path = os.path.join(job_folder, clip_name)
            clip_segment(video_path, moment['start'], moment['end'], output_path)

            metadata.append({
                "filename":     clip_name,
                "rank":         i + 1,
                "start_time":   round(moment['start'], 2),
                "end_time":     round(moment['end'], 2),
                "duration":     round(moment['end'] - moment['start'], 2),
                "peak_time":    round(moment['time'], 2),
                "energy_score": round(moment['energy'] * 100, 1),
            })
            jobs[job_id]['progress'] = 60 + int(40 * (i + 1) / max(1, len(selected)))

        # ── Save metadata + cleanup ───────────────────────────────────────────
        with open(os.path.join(job_folder, 'metadata.json'), 'w') as f:
            json.dump({"highlights": metadata}, f, indent=2)

        try:
            os.remove(audio_path)
        except Exception:
            pass

        jobs[job_id]['status']   = 'complete'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['metadata'] = metadata

        logger.info(f"[{job_id}] Done — {len(metadata)} clips generated")
        return True

    except Exception as e:
        logger.error(f"[{job_id}] Error: {e}", exc_info=True)
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error']  = str(e)
        return False
