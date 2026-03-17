import os
import json
import subprocess
import logging

from utils.transcribe import transcribe_video
from utils.chunk_and_filter import chunk_transcript, score_and_filter
from utils.gpt_highlight import find_highlights
import config.config as config

logger = logging.getLogger(__name__)


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def clip_segment(video_path: str, start: float, end: float, output_path: str):
    """Cut a clip from video_path using ffmpeg."""
    duration = max(0.1, end - start)
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


def process_lecture(video_path, jobs, job_id, num_highlights=3, min_duration=20, max_duration=30):
    """Full lecture highlight pipeline: transcribe → chunk → filter → GPT → clip."""
    try:
        job_folder = os.path.join(config.RESULTS_FOLDER, job_id)
        os.makedirs(job_folder, exist_ok=True)

        jobs[job_id]['status'] = 'processing'
        jobs[job_id]['progress'] = 5

        # ── Step 1: Transcribe ────────────────────────────────────────────────
        logger.info(f"[{job_id}] Transcribing...")
        jobs[job_id]['progress'] = 10
        segments = transcribe_video(video_path)
        jobs[job_id]['progress'] = 40

        # Save raw transcript
        transcript_path = os.path.join(job_folder, 'transcript.txt')
        with open(transcript_path, 'w', encoding='utf-8') as f:
            for seg in segments:
                f.write(f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}\n")

        # ── Step 2: Chunk ─────────────────────────────────────────────────────
        logger.info(f"[{job_id}] Chunking transcript...")
        chunks = chunk_transcript(segments, window_sec=30.0)
        jobs[job_id]['progress'] = 45

        # ── Step 3: Score all chunks (always needed for fallback) ────────────
        logger.info(f"[{job_id}] Scoring chunks...")
        scored_chunks = score_and_filter(chunks, top_percent=1.0)  # score all, keep all
        jobs[job_id]['progress'] = 50

        # ── Step 4: AI/fallback highlight selection ───────────────────────────
        # If an API key is available, send ALL scored chunks so the AI picks freely.
        # If using local fallback only, pre-filter to top 40% to reduce noise.
        has_api = bool(os.getenv('GROQ_API_KEY') or os.getenv('ANTHROPIC_API_KEY'))
        chunks_for_ai = scored_chunks if has_api else score_and_filter(chunks, top_percent=0.4)
        logger.info(f"[{job_id}] Running highlight selection (API={'yes' if has_api else 'no'}, chunks={len(chunks_for_ai)})...")
        highlights_info = find_highlights(chunks_for_ai, num_highlights, min_duration, max_duration, segments)
        jobs[job_id]['progress'] = 70

        # ── Step 5: Clip generation ───────────────────────────────────────────
        logger.info(f"[{job_id}] Generating clips...")
        metadata = []
        for i, h in enumerate(highlights_info):
            clip_name = f"clip_{i + 1}.mp4"
            output_path = os.path.join(job_folder, clip_name)
            clip_segment(video_path, h['start_time'], h['end_time'], output_path)
            metadata.append({
                "filename": clip_name,
                "start_time": h['start_time'],
                "end_time": h['end_time'],
                "duration": h['end_time'] - h['start_time'],
                "topic": h.get('topic', f'Clip {i + 1}'),
                "summary": h.get('summary', '')
            })
            jobs[job_id]['progress'] = 70 + int(30 * (i + 1) / max(1, len(highlights_info)))

        # Save metadata
        with open(os.path.join(job_folder, 'metadata.json'), 'w') as f:
            json.dump({"highlights": metadata}, f, indent=2)

        jobs[job_id]['status'] = 'complete'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['metadata'] = metadata
        jobs[job_id]['transcript_path'] = transcript_path

        logger.info(f"[{job_id}] Done — {len(metadata)} clips generated")
        return True

    except Exception as e:
        logger.error(f"[{job_id}] Processing error: {e}", exc_info=True)
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error'] = str(e)
        return False
