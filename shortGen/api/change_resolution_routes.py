from flask import Blueprint, request, send_file, jsonify
import os
import uuid
import subprocess
import glob
import shutil
from werkzeug.utils import secure_filename

change_resolution_bp = Blueprint("change_resolution", __name__)


def resolve_ffmpeg_path() -> str:
    env_path = os.getenv("FFMPEG_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    candidates = glob.glob(os.path.join(project_root, "ffmpeg-*-essentials_build", "bin", "ffmpeg.exe"))
    if candidates:
        return candidates[0]

    path_from_env = shutil.which("ffmpeg")
    return path_from_env or "ffmpeg"


FFMPEG_PATH = resolve_ffmpeg_path()
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")

os.makedirs(TEMP_DIR, exist_ok=True)

SUPPORTED_RESOLUTIONS = {"3840x2160", "2560x1440", "1920x1080", "1280x720", "854x480", "640x360"}


@change_resolution_bp.route("/api/change-resolution", methods=["POST"])
def change_resolution():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        resolution = request.form.get("resolution", "1280x720")
        if resolution not in SUPPORTED_RESOLUTIONS:
            return jsonify({"error": "Unsupported resolution"}), 400

        unique_id = str(uuid.uuid4())
        input_ext = os.path.splitext(secure_filename(file.filename))[1]
        input_name = f"{unique_id}_input{input_ext}"
        output_name = f"{unique_id}_output.mp4"

        input_path = os.path.join(TEMP_DIR, input_name)
        output_path = os.path.join(TEMP_DIR, output_name)

        file.save(input_path)

        command = [
            FFMPEG_PATH,
            "-i", input_path,
            "-vf", f"scale={resolution}",
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "medium",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            "-y", output_path,
        ]

        result = subprocess.run(command, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            if os.path.exists(input_path):
                os.remove(input_path)
            return jsonify({"error": f"FFmpeg error: {result.stderr}"}), 500

        if not os.path.exists(output_path):
            if os.path.exists(input_path):
                os.remove(input_path)
            return jsonify({"error": "Output file not created"}), 500

        try:
            response = send_file(
                output_path,
                as_attachment=True,
                download_name=f"{os.path.splitext(file.filename)[0]}_{resolution}.mp4",
            )

            @response.call_on_close
            def cleanup():
                try:
                    if os.path.exists(input_path):
                        os.remove(input_path)
                    if os.path.exists(output_path):
                        os.remove(output_path)
                except Exception:
                    pass

            return response

        except Exception as e:
            if os.path.exists(input_path):
                os.remove(input_path)
            if os.path.exists(output_path):
                os.remove(output_path)
            return jsonify({"error": f"Failed to send file: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500
