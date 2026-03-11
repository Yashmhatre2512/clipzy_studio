from flask import Blueprint, request, send_file, jsonify
import os
import uuid
import subprocess
import glob
import shutil
from werkzeug.utils import secure_filename

change_format_bp = Blueprint("change_format", __name__)

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

SUPPORTED_FORMATS = {"mp4", "webm", "mov", "avi", "mkv"}

CODEC_MAP = {
    "mp4": ["-c:v", "libx264", "-c:a", "aac"],
    "mov": ["-c:v", "libx264", "-c:a", "aac"],
    "webm": ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
    "avi": ["-c:v", "libxvid", "-c:a", "libmp3lame"],
    "mkv": ["-c:v", "libx264", "-c:a", "aac"],
}

QUALITY_MAP = {
    "mp4": ["-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-b:a", "192k"],
    "mov": ["-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-b:a", "192k"],
    "webm": ["-crf", "30", "-b:v", "0", "-b:a", "160k"],
    "avi": ["-qscale:v", "2", "-b:a", "192k"],
    "mkv": ["-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-b:a", "192k"],
}


@change_format_bp.route("/api/change-format", methods=["POST"])
def change_format():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        output_format = request.form.get("output_format", "mp4").lower().strip(".")
        if output_format not in SUPPORTED_FORMATS:
            return jsonify({"error": "Unsupported output format"}), 400

        unique_id = str(uuid.uuid4())
        input_ext = os.path.splitext(secure_filename(file.filename))[1]
        input_name = f"{unique_id}_input{input_ext}"
        output_name = f"{unique_id}_output.{output_format}"

        input_path = os.path.join(TEMP_DIR, input_name)
        output_path = os.path.join(TEMP_DIR, output_name)

        file.save(input_path)

        # First try fast remux (no re-encode) for speed and zero quality loss
        copy_command = [FFMPEG_PATH, "-i", input_path, "-c", "copy", "-y", output_path]
        copy_result = subprocess.run(copy_command, capture_output=True, text=True, timeout=600)

        if copy_result.returncode != 0 or not os.path.exists(output_path):
            # Fallback to re-encode with higher quality settings
            encode_command = [FFMPEG_PATH, "-i", input_path] + CODEC_MAP[output_format] + QUALITY_MAP[output_format] + ["-y", output_path]
            result = subprocess.run(encode_command, capture_output=True, text=True, timeout=600)
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
                download_name=f"{os.path.splitext(file.filename)[0]}.{output_format}",
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
