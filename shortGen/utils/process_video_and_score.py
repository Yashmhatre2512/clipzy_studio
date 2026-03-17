# app.py - Flask API for Video Highlight Generation
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
import threading
import time
import shutil
import logging
from werkzeug.utils import secure_filename

# Import video processing functions
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips
import subprocess
import pandas as pd
import numpy as np
import cv2
import math
import wave

# Import new modules
from utils.scene_intensity import analyze_scene_intensity
from utils.sentiment_analysis import analyze_sentiment
# Configuration

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
import config.config as config

# Create necessary directories
os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(config.RESULTS_FOLDER, exist_ok=True)
os.makedirs('temp', exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS

def merge_scores(sentiment_scores, intensity_scores, weight_sentiment=0.4, weight_intensity=0.6, num_highlights=3):
    """
    Merge sentiment analysis scores and visual intensity scores to find the best highlights.
    
    Parameters:
    - sentiment_scores: List of dicts with {'start_time', 'end_time', 'score'} from sentiment analysis
    - intensity_scores: List of dicts with {'start_time', 'end_time', 'score'} from scene intensity
    - weight_sentiment: Weight to give sentiment scores in the final scoring (0-1)
    - weight_intensity: Weight to give intensity scores in the final scoring (0-1)
    - num_highlights: Number of highlights to return
    
    Returns:
    - List of dicts with {'start_time', 'end_time', 'score'} representing the top highlights
    """
    # Normalize scores within each category
    def normalize_scores(scores_list):
        if not scores_list:
            return []
            
        max_score = max(item['score'] for item in scores_list)
        min_score = min(item['score'] for item in scores_list)
        score_range = max_score - min_score if max_score > min_score else 1
        
        normalized = []
        for item in scores_list:
            normalized_item = item.copy()
            normalized_item['score'] = (item['score'] - min_score) / score_range
            normalized.append(normalized_item)
        return normalized
    
    norm_sentiment = normalize_scores(sentiment_scores)
    norm_intensity = normalize_scores(intensity_scores)
    
    # Create segments dictionary to track all potential highlight segments
    all_segments = {}
    
    # Add sentiment segments
    for item in norm_sentiment:
        key = (item['start_time'], item['end_time'])
        if key not in all_segments:
            all_segments[key] = {
                'start_time': item['start_time'],
                'end_time': item['end_time'],
                'sentiment_score': item['score'],
                'intensity_score': 0
            }
        else:
            all_segments[key]['sentiment_score'] = item['score']
    
    # Add intensity segments
    for item in norm_intensity:
        key = (item['start_time'], item['end_time'])
        if key not in all_segments:
            all_segments[key] = {
                'start_time': item['start_time'],
                'end_time': item['end_time'],
                'sentiment_score': 0,
                'intensity_score': item['score']
            }
        else:
            all_segments[key]['intensity_score'] = item['score']
    
    # Calculate combined scores
    merged_results = []
    for segment in all_segments.values():
        combined_score = (segment['sentiment_score'] * weight_sentiment + 
                         segment['intensity_score'] * weight_intensity)
        
        merged_results.append({
            'start_time': segment['start_time'],
            'end_time': segment['end_time'],
            'score': combined_score
        })
    
    # Sort by score and return top highlights
    merged_results.sort(key=lambda x: x['score'], reverse=True)
    return merged_results[:num_highlights]

# Video processing function
def process_video(video_path, jobs, job_id, num_highlights=3, highlight_duration=(25, 30)):
    """Process a video file to generate sports highlights based on audio + visual intensity.

    This simplified pipeline computes per-second audio RMS and per-second visual motion
    (frame differences), combines them, and selects top non-overlapping centered highlights
    of the requested duration range. This avoids external dependencies (Whisper/scenedetect)
    and is tuned for sports videos where audio spikes and motion indicate highlights.
    """
    try:
        job_folder = os.path.join(config.RESULTS_FOLDER, job_id)
        os.makedirs(job_folder, exist_ok=True)

        # Update job status
        jobs[job_id]['status'] = 'processing'
        jobs[job_id]['progress'] = 5

        # Try to get duration quickly using ffprobe to avoid heavy MoviePy init
        def get_duration_ffprobe(path):
            try:
                cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                       '-of', 'default=noprint_wrappers=1:nokey=1', path]
                out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()
                return float(out)
            except Exception:
                return None

        total_duration = get_duration_ffprobe(video_path)
        if total_duration is None:
            # fallback to MoviePy if ffprobe is not available
            try:
                tmp_clip = VideoFileClip(video_path)
                total_duration = tmp_clip.duration
                try:
                    tmp_clip.reader.close()
                except Exception:
                    pass
                try:
                    if tmp_clip.audio:
                        tmp_clip.audio.reader.close_proc()
                except Exception:
                    pass
            except Exception as e:
                logger.error(f"Failed to read video duration: {e}")
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['error'] = f"Failed to read video duration: {e}"
                return False

        logger.info(f"Video duration: {total_duration:.2f} seconds")
        jobs[job_id]['progress'] = 15

        # Parameters
        window = 1.0  # seconds per analysis bin
        n_bins = max(1, int(math.ceil(total_duration / window)))

        # Audio energy per bin (RMS)
        audio_scores = np.zeros(n_bins, dtype=float)
        # Extract audio once into a temporary WAV (mono, 22050 Hz) to stream-read without huge memory
        audio_tmp = os.path.join('temp', f"{job_id}_audio.wav")
        has_audio = False
        try:
            cmd = ['ffmpeg', '-y', '-i', video_path, '-vn', '-ac', '1', '-ar', '22050', '-acodec', 'pcm_s16le', audio_tmp]
            subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            has_audio = os.path.exists(audio_tmp)
        except Exception as e:
            logger.warning(f"Audio extraction failed: {e}")

        if has_audio:
            try:
                with wave.open(audio_tmp, 'rb') as wf:
                    samp_rate = wf.getframerate()
                    frames_per_bin = int(samp_rate * window)
                    for i in range(n_bins):
                        frames = wf.readframes(frames_per_bin)
                        if len(frames) == 0:
                            break
                        arr = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
                        if arr.size == 0:
                            continue
                        audio_scores[i] = float(np.sqrt(np.mean((arr / 32768.0) ** 2)))
            except Exception as e:
                logger.warning(f"Audio file read failed: {e}")
            # remove temporary audio file to save space
            try:
                if os.path.exists(audio_tmp):
                    os.remove(audio_tmp)
            except Exception:
                pass

        jobs[job_id]['progress'] = 40

        # Visual motion per bin: extract 1fps frames via ffmpeg into a temp folder and process sequentially
        visual_scores = np.zeros(n_bins, dtype=float)
        frames_dir = os.path.join('temp', f"{job_id}_frames")
        try:
            if os.path.exists(frames_dir):
                shutil.rmtree(frames_dir)
            os.makedirs(frames_dir, exist_ok=True)

            # ffmpeg extract 1 frame per second (fps=1)
            frame_pattern = os.path.join(frames_dir, 'frame_%06d.jpg')
            cmd = ['ffmpeg', '-y', '-i', video_path, '-vf', 'fps=1', frame_pattern]
            # run with a timeout to avoid indefinite hangs on bad inputs
            try:
                subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
            except subprocess.TimeoutExpired:
                logger.warning('Frame extraction timed out; falling back to direct seek')
                raise
            except Exception as e:
                logger.warning(f'Frame extraction failed: {e}; falling back to direct seek')
                raise

            # Read extracted frames sequentially
            frame_files = sorted([f for f in os.listdir(frames_dir) if f.lower().endswith('.jpg')])
            prev_gray = None
            for i, fname in enumerate(frame_files):
                try:
                    img_path = os.path.join(frames_dir, fname)
                    frame = cv2.imread(img_path)
                    if frame is None:
                        prev_gray = None
                        continue
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    if prev_gray is not None:
                        diff = cv2.absdiff(gray, prev_gray).astype(np.float32)
                        if i < len(visual_scores):
                            visual_scores[i] = float(np.mean(diff))
                    prev_gray = gray
                except Exception:
                    prev_gray = None
                    continue

        except Exception:
            # Fallback: try direct seeking with OpenCV
            try:
                cap = cv2.VideoCapture(video_path)
                prev_gray = None
                for i in range(n_bins):
                    t = min(i * window, max(0.0, total_duration - 0.001))
                    cap.set(cv2.CAP_PROP_POS_MSEC, int(t * 1000))
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        prev_gray = None
                        continue
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    if prev_gray is not None:
                        diff = cv2.absdiff(gray, prev_gray).astype(np.float32)
                        visual_scores[i] = float(np.mean(diff))
                    prev_gray = gray
                cap.release()
            except Exception as e:
                logger.warning(f"Visual analysis failed entirely: {e}")
        finally:
            try:
                if os.path.exists(frames_dir):
                    shutil.rmtree(frames_dir)
            except Exception:
                pass

        jobs[job_id]['progress'] = 60

        # Normalize scores
        def normalize(arr):
            if np.all(arr == 0):
                return arr
            a = np.array(arr, dtype=float)
            amin = a.min()
            amax = a.max()
            if amax <= amin:
                return np.zeros_like(a)
            return (a - amin) / (amax - amin)

        na = normalize(audio_scores)
        nv = normalize(visual_scores)

        # Weighted combination (audio heavier for sports)
        combined = 0.65 * na + 0.35 * nv

        # Select top non-overlapping highlights
        desired = float((highlight_duration[0] + highlight_duration[1]) / 2.0)
        half = desired / 2.0

        # candidate centers: bin center times
        bin_centers = [(i * window + window / 2.0) for i in range(n_bins)]
        candidates = sorted(list(enumerate(combined)), key=lambda x: -x[1])

        selected = []
        for idx, score in candidates:
            if len(selected) >= num_highlights:
                break
            center = bin_centers[idx]
            s = max(0.0, center - half)
            e = min(total_duration, center + half)
            # expand if near edges to keep desired length
            if (e - s) < desired:
                if s == 0.0:
                    e = min(total_duration, s + desired)
                elif e == total_duration:
                    s = max(0.0, e - desired)
            # avoid overlaps
            overlap = any(not (e <= os_ or s >= oe) for os_, oe in selected)
            if not overlap and (e - s) >= highlight_duration[0]:
                selected.append((s, e))

        # fallback: evenly distributed segments (starting from 0) if not enough
        if len(selected) < num_highlights:
            remaining = num_highlights - len(selected)
            seg_len = desired
            # place segments from start, spacing by seg_len
            i = 0
            while len(selected) < num_highlights and i * seg_len < total_duration:
                s = i * seg_len
                e = min(total_duration, s + seg_len)
                # ensure not overlapping
                if not any(not (e <= os_ or s >= oe) for os_, oe in selected) and (e - s) >= 1.0:
                    selected.append((s, e))
                i += 1

        # ensure we have exactly num_highlights (trim or pad)
        selected = sorted(selected, key=lambda x: x[0])[:num_highlights]

        # Create MoviePy clip only when we need to write highlights
        try:
            clip = VideoFileClip(video_path)
        except Exception as e:
            logger.error(f"Failed to create MoviePy clip for final writing: {e}")
            jobs[job_id]['status'] = 'failed'
            jobs[job_id]['error'] = f"Failed to create clip: {e}"
            return False

        jobs[job_id]['progress'] = 75

        # Create highlight videos
        highlight_paths = []
        metadata = []

        for i, (start, end) in enumerate(selected):
            highlight_name = f"highlight_{i+1}.mp4"
            output_path = os.path.join(job_folder, highlight_name)
            logger.info(f"Creating highlight {i+1} from {start:.2f}s to {end:.2f}s")
            subclip = clip.subclip(start, end)
            subclip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac' if has_audio else None,
                threads=2,
                verbose=False,
                logger=None
            )
            highlight_paths.append(output_path)
            metadata.append({
                "filename": highlight_name,
                "start_time": start,
                "end_time": end,
                "duration": end - start
            })
            jobs[job_id]['progress'] = 75 + int(25 * (i + 1) / max(1, len(selected)))

        # Save metadata
        with open(os.path.join(job_folder, 'metadata.json'), 'w') as f:
            import json
            json.dump({
                "original_video": os.path.basename(video_path),
                "total_duration": total_duration,
                "has_audio": has_audio,
                "highlights": metadata
            }, f, indent=2)

        # Clean up
        clip.close()

        # Update job status to complete
        jobs[job_id]['status'] = 'complete'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['result_files'] = highlight_paths
        jobs[job_id]['metadata'] = metadata

        logger.info(f"Job {job_id} completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error'] = str(e)
        return False
