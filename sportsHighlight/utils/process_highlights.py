import os
import json
import subprocess
import logging

from utils.extract_audio import extract_audio_chunk
from utils.detect_moments import detect_exciting_moments, deduplicate_moments
import config.config as config

logger = logging.getLogger(__name__)


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    return float(result.stdout.strip())


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


def process_highlights(video_path, jobs, job_id, num_clips=5, clip_duration=30):
    """
    Full pipeline for large video sports highlights:
      1. Get video duration
      2. Chunk the video into overlapping segments
      3. Extract audio per chunk and detect moments
      4. Deduplicate moments across chunk boundaries
      5. Select top N moments sorted by energy
      6. Extend moments if shorter than requested clip_duration
      7. Generate clips with ffmpeg
    """
    try:
        job_folder = os.path.join(config.RESULTS_FOLDER, job_id)
        os.makedirs(job_folder, exist_ok=True)

        jobs[job_id]['status'] = 'processing'
        jobs[job_id]['progress'] = 2

        # ── Step 1: Get video duration ──────────────────────────────────────
        logger.info(f"[{job_id}] Getting video duration...")
        total_duration = get_video_duration(video_path)
        jobs[job_id]['total_duration'] = round(total_duration, 1)
        logger.info(f"[{job_id}] Video duration: {total_duration:.1f}s")
        jobs[job_id]['progress'] = 5

        # ── Step 2: Build chunk list ────────────────────────────────────────
        chunk_dur = config.CHUNK_DURATION_SEC
        overlap   = config.CHUNK_OVERLAP_SEC
        step      = chunk_dur - overlap

        chunks = []
        offset = 0.0
        while offset < total_duration:
            end = min(offset + chunk_dur, total_duration)
            chunks.append((offset, end - offset))  # (start, duration)
            offset += step

        num_chunks = len(chunks)
        jobs[job_id]['num_chunks'] = num_chunks
        logger.info(f"[{job_id}] Split into {num_chunks} chunks "
                     f"({chunk_dur}s each, {overlap}s overlap)")
        jobs[job_id]['progress'] = 8

        # ── Step 3: Process each chunk ──────────────────────────────────────
        all_moments = []
        for ci, (chunk_start, chunk_length) in enumerate(chunks):
            logger.info(f"[{job_id}] Processing chunk {ci+1}/{num_chunks} "
                         f"({chunk_start:.1f}s - {chunk_start + chunk_length:.1f}s)")

            # Extract audio for this chunk
            chunk_audio = os.path.join(job_folder, f'chunk_{ci}_audio.wav')
            extract_audio_chunk(video_path, chunk_audio, chunk_start, chunk_length)

            # Detect moments in this chunk
            min_gap = max(5.0, clip_duration * 0.5)
            moments = detect_exciting_moments(
                chunk_audio,
                min_gap_sec=min_gap,
                chunk_offset=chunk_start,
            )
            all_moments.extend(moments)

            # Cleanup chunk audio
            try:
                os.remove(chunk_audio)
            except Exception:
                pass

            # Progress: 8% → 55% across all chunks
            pct = 8 + int(47 * (ci + 1) / num_chunks)
            jobs[job_id]['progress'] = pct

        # ── Step 4: Deduplicate across chunk boundaries ─────────────────────
        logger.info(f"[{job_id}] Deduplicating {len(all_moments)} moments...")
        jobs[job_id]['progress'] = 58
        moments = deduplicate_moments(all_moments, min_gap_sec=max(5.0, clip_duration * 0.5))
        jobs[job_id]['progress'] = 60

        if not moments:
            raise RuntimeError("No exciting moments detected in the video. "
                               "Try a different video with crowd noise or commentary.")

        # ── Step 5: Select top N ────────────────────────────────────────────
        selected = moments[:num_clips]

        # Extend moment duration if shorter than requested
        for m in selected:
            natural_dur = m['end'] - m['start']
            if natural_dur < clip_duration:
                shortfall = clip_duration - natural_dur
                extra_before = min(shortfall * 0.4, m['start'])
                extra_after  = shortfall - extra_before
                m['start'] = max(0.0, m['start'] - extra_before)
                m['end']   = min(total_duration, m['end'] + extra_after)

        # ── Step 6: Generate clips ──────────────────────────────────────────
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
            jobs[job_id]['progress'] = 60 + int(38 * (i + 1) / max(1, len(selected)))

        # ── Save metadata + cleanup ─────────────────────────────────────────
        with open(os.path.join(job_folder, 'metadata.json'), 'w') as f:
            json.dump({"highlights": metadata}, f, indent=2)

        jobs[job_id]['status']   = 'complete'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['metadata'] = metadata

        logger.info(f"[{job_id}] Done — {len(metadata)} clips generated from "
                     f"{total_duration:.0f}s video ({num_chunks} chunks)")
        return True

    except Exception as e:
        logger.error(f"[{job_id}] Error: {e}", exc_info=True)
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error']  = str(e)
        return False
