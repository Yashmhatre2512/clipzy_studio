from flask import Blueprint, request, jsonify, send_from_directory, make_response
import os
import uuid
import tempfile
import time
import traceback
from werkzeug.utils import secure_filename

# Import moviepy (1.x uses moviepy.editor, 2.x uses moviepy directly)
try:
    from moviepy.editor import VideoFileClip
except ImportError:
    try:
        from moviepy import VideoFileClip
    except ImportError:
        VideoFileClip = None

trim_bp = Blueprint("trim", __name__)

RESULTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

@trim_bp.route("/trim", methods=["POST", "OPTIONS"])
def trim_video():
    """Trim video endpoint"""
    if request.method == "OPTIONS":
        response = make_response("", 204)
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response
    
    if VideoFileClip is None:
        return jsonify({"error": "moviepy not installed"}), 500
    
    try:
        print("📝 Trim request received")
        
        if "video" not in request.files:
            print("❌ No video file in request")
            return jsonify({"error": "No video file provided"}), 400
        
        video = request.files["video"]
        print(f"📹 Video file received: {video.filename}")
        
        if not request.form.get("start") or not request.form.get("end"):
            print("❌ Missing start or end time")
            return jsonify({"error": "Missing start or end time"}), 400
        
        start = float(request.form["start"])
        end = float(request.form["end"])
        print(f"⏱️ Trim times: start={start}, end={end}")

        if start >= end:
            return jsonify({"error": "Start time must be less than end time"}), 400

        # Create job directory
        job_id = str(uuid.uuid4())
        job_dir = os.path.join(RESULTS_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)

        # Save uploaded video temporarily
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", mode='wb', dir=job_dir)
        temp_input_path = temp_input.name
        temp_input.close()
        video.save(temp_input_path)
        print(f"💾 Temporary file saved: {temp_input_path}")

        temp_clip = None
        try:
            # Trim video
            print("✂️ Trimming video...")
            temp_clip = VideoFileClip(temp_input_path)
            
            # Validate trim times
            if start < 0 or end > temp_clip.duration:
                return jsonify({"error": f"Invalid trim times. Video duration is {temp_clip.duration:.2f} seconds"}), 400
            
            clip = temp_clip.subclip(start, end)

            # Save trimmed video
            output_filename = f"trimmed_{secure_filename(video.filename)}"
            output_path = os.path.join(job_dir, output_filename)

            print(f"🎬 Writing trimmed video to {output_path}")
            clip.write_videofile(
                output_path, 
                codec="libx264",
                audio_codec="aac",
                verbose=False, 
                logger=None
            )
            
            # Close clip resources
            clip.close()
            
            print("✅ Trim completed successfully")

            # Return JSON with video URL
            return jsonify({
                "video_url": f"/results/{job_id}/{output_filename}",
                "job_id": job_id
            }), 200
        
        finally:
            # Properly close temp clip
            if temp_clip is not None:
                try:
                    temp_clip.close()
                except Exception as close_err:
                    print(f"⚠️ Error closing temp clip: {close_err}")
            
            # Clean up temp file with retry logic
            if os.path.exists(temp_input_path):
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        os.remove(temp_input_path)
                        print(f"✅ Temporary file deleted: {temp_input_path}")
                        break
                    except Exception as delete_err:
                        if attempt < max_retries - 1:
                            print(f"⚠️ Retry {attempt + 1}/{max_retries - 1} - Failed to delete temp file: {delete_err}")
                            time.sleep(0.5)
                        else:
                            print(f"⚠️ Could not delete temp file after {max_retries} attempts: {delete_err}")
    
    except ValueError as e:
        print(f"❌ ValueError: {str(e)}")
        return jsonify({"error": f"Invalid time values: {str(e)}"}), 400
    except Exception as e:
        tb = traceback.format_exc()
        print(f"❌ Exception in /trim:\n{tb}")
        return jsonify({"error": f"Failed to trim video: {str(e)}"}), 500


@trim_bp.route("/results/<job_id>/<filename>", methods=["GET"])
def serve_trimmed_video(job_id, filename):
    """Serve the trimmed video file"""
    try:
        job_dir = os.path.join(RESULTS_DIR, job_id)
        return send_from_directory(job_dir, filename, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 404
