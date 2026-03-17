import os
import uuid
import threading
import time
import logging

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename

from jobs.job_manager import jobs
from utils.process_lecture import allowed_file, process_lecture
import config.config as config

lecture_bp = Blueprint('lecture_bp', __name__)
logger = logging.getLogger(__name__)


@lecture_bp.route('/upload', methods=['POST'])
def upload_video():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400

        file = request.files['video']
        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400

        job_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_path = os.path.join(config.UPLOAD_FOLDER, f"{job_id}_{filename}")
        file.save(file_path)

        num_highlights = int(request.form.get('num_highlights', 3))
        min_duration   = int(request.form.get('min_duration', 20))
        max_duration   = int(request.form.get('max_duration', 30))

        jobs[job_id] = {
            'id': job_id,
            'filename': filename,
            'file_path': file_path,
            'status': 'queued',
            'progress': 0,
            'created_at': time.time(),
        }

        def run():
            try:
                process_lecture(file_path, jobs, job_id, num_highlights, min_duration, max_duration)
            except Exception as e:
                logger.error(f"Processing error: {e}", exc_info=True)
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['error'] = str(e)

        threading.Thread(target=run, daemon=True).start()

        return jsonify({'job_id': job_id, 'status': 'queued',
                        'message': 'Upload successful. Processing started.'}), 202

    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@lecture_bp.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    job = {k: v for k, v in jobs[job_id].items() if k not in ('file_path', 'metadata', 'transcript_path')}
    return jsonify(job), 200


@lecture_bp.route('/results/<job_id>', methods=['GET'])
def get_results(job_id):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = jobs[job_id]
    if job['status'] != 'complete':
        return jsonify({'status': job['status'], 'progress': job['progress']}), 202

    highlight_urls = []
    for i, meta in enumerate(job.get('metadata', [])):
        highlight_urls.append({
            'id': i + 1,
            'filename': meta['filename'],
            'url': f"/api/clip/{job_id}/{meta['filename']}",
            'duration': meta['duration'],
            'start_time': meta['start_time'],
            'end_time': meta['end_time'],
            'topic': meta.get('topic', f'Clip {i + 1}'),
            'summary': meta.get('summary', '')
        })

    has_transcript = os.path.exists(job.get('transcript_path', ''))
    return jsonify({
        'job_id': job_id,
        'status': 'complete',
        'highlights': highlight_urls,
        'transcript_url': f"/api/transcript/{job_id}" if has_transcript else None
    }), 200


@lecture_bp.route('/clip/<job_id>/<filename>', methods=['GET'])
def serve_clip(job_id, filename):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    file_path = os.path.join(config.RESULTS_FOLDER, job_id, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    return send_file(file_path, mimetype='video/mp4', conditional=True)


@lecture_bp.route('/transcript/<job_id>', methods=['GET'])
def get_transcript(job_id):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    transcript_path = jobs[job_id].get('transcript_path', '')
    if not os.path.exists(transcript_path):
        return jsonify({'error': 'Transcript not available'}), 404
    return send_file(transcript_path, mimetype='text/plain')
