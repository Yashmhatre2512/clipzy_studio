import os
import uuid
import threading
import time
import logging

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename

from jobs.job_manager import jobs
from utils.process_sports import allowed_file, process_sports
import config.config as config

sports_bp = Blueprint('sports_bp', __name__)
logger    = logging.getLogger(__name__)


@sports_bp.route('/upload', methods=['POST'])
def upload_video():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400

        file = request.files['video']
        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use mp4, mov, avi, mkv, or webm.'}), 400

        job_id   = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_path = os.path.join(config.UPLOAD_FOLDER, f"{job_id}_{filename}")
        file.save(file_path)

        num_clips     = int(request.form.get('num_clips', 5))
        clip_duration = int(request.form.get('clip_duration', 30))

        jobs[job_id] = {
            'id':         job_id,
            'filename':   filename,
            'file_path':  file_path,
            'status':     'queued',
            'progress':   0,
            'created_at': time.time(),
        }

        def run():
            try:
                process_sports(file_path, jobs, job_id, num_clips, clip_duration)
            except Exception as e:
                logger.error(f"Processing error: {e}", exc_info=True)
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['error']  = str(e)

        threading.Thread(target=run, daemon=True).start()

        return jsonify({'job_id': job_id, 'status': 'queued',
                        'message': 'Upload successful. Processing started.'}), 202

    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@sports_bp.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    job = {k: v for k, v in jobs[job_id].items() if k not in ('file_path', 'metadata')}
    return jsonify(job), 200


@sports_bp.route('/results/<job_id>', methods=['GET'])
def get_results(job_id):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = jobs[job_id]
    if job['status'] != 'complete':
        return jsonify({'status': job['status'], 'progress': job['progress']}), 202

    highlights = []
    for meta in job.get('metadata', []):
        highlights.append({
            **meta,
            'url': f"/api/clip/{job_id}/{meta['filename']}",
        })

    return jsonify({'job_id': job_id, 'status': 'complete', 'highlights': highlights}), 200


@sports_bp.route('/clip/<job_id>/<filename>', methods=['GET'])
def serve_clip(job_id, filename):
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    file_path = os.path.join(config.RESULTS_FOLDER, job_id, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    return send_file(file_path, mimetype='video/mp4', conditional=True)
