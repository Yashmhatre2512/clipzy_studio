import os
import traceback
import asyncio
import shutil
import tempfile
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from moviepy.config import change_settings
from moviepy.editor import VideoFileClip

# ------------------ Dynamic ImageMagick Detection ------------------
def detect_imagemagick():
    path = shutil.which("magick")
    if path and os.path.isfile(path):
        change_settings({"IMAGEMAGICK_BINARY": path})
        print(f"✅ ImageMagick detected in PATH: {path}")
        return path

    common_paths = [
        r"C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe",
        r"C:\Program Files\ImageMagick-7.1.1-Q16-HDRI\magick.exe",
        r"C:\Program Files\ImageMagick-7.0.10-Q16\magick.exe",
    ]
    for p in common_paths:
        if os.path.isfile(p):
            change_settings({"IMAGEMAGICK_BINARY": p})
            print(f"✅ ImageMagick detected at {p}")
            return p

    raise EnvironmentError("❌ ImageMagick not found! Please install it and add it to PATH.")

# Detect at startup
detect_imagemagick()

# ------------------ Flask setup ------------------
app = Flask(__name__, static_folder="static")
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Add after_request handler to ensure CORS headers are always present
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# ------------------ Health check ------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

# ------------------ Generate video route (dummy) ------------------
@app.route("/generate-video", methods=["POST"])
def generate_video_api():
    try:
        data = request.get_json(force=True)
        topic = data.get("topic")
        duration = int(data.get("duration", 60))

        if not topic:
            return jsonify({"error": "Missing 'topic' in request body"}), 400

        # Dummy response
        return jsonify({
            "topic": topic,
            "duration": duration,
            "script": f"Generated script for {topic}",
            "video_url": "/videos/rendered_video.mp4"
        }), 200

    except Exception:
        tb = traceback.format_exc()
        app.logger.error("Exception in /generate-video:\n%s", tb)
        return jsonify({"error": "Internal server error"}), 500

# ------------------ Serve videos ------------------
@app.route("/videos/<filename>", methods=["GET"])
def serve_video(filename):
    return send_from_directory("static", filename)

# ------------------ Trim video route ------------------
@app.route("/trim", methods=["POST", "OPTIONS"])
def trim_video():
    if request.method == "OPTIONS":
        return "", 204
    
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

        # Save uploaded video temporarily
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", mode='wb')
        temp_input_path = temp_input.name
        temp_input.close()
        video.save(temp_input_path)
        print(f"💾 Temporary file saved: {temp_input_path}")

        temp_clip = None
        try:
            # Trim video
            print("✂️ Trimming video...")
            temp_clip = VideoFileClip(temp_input_path)
            clip = temp_clip.subclip(start, end)

            # Save trimmed video into static folder
            output_filename = "trimmed_video.mp4"
            output_path = os.path.join("static", output_filename)

            # Overwrite if exists
            if os.path.exists(output_path):
                os.remove(output_path)

            print(f"🎬 Writing trimmed video to {output_path}")
            clip.write_videofile(output_path, codec="libx264", verbose=False, logger=None)
            
            # Close clip resources
            clip.close()
            
            print("✅ Trim completed successfully")

            # Return JSON with video URL
            return jsonify({
                "video_url": f"/videos/{output_filename}"
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
                            # Don't fail - just log it
    
    except ValueError as e:
        print(f"❌ ValueError: {str(e)}")
        return jsonify({"error": f"Invalid time values: {str(e)}"}), 400
    except Exception as e:
        tb = traceback.format_exc()
        print(f"❌ Exception in /trim:\n{tb}")
        app.logger.error("Exception in /trim:\n%s", tb)
        return jsonify({"error": f"Failed to trim video: {str(e)}"}), 500

# ------------------ Analyze hashtags route ------------------
@app.route("/analyze-hashtags", methods=["POST"])
def analyze_hashtags():
    try:
        if "video" not in request.files:
            return jsonify({"error": "No video file provided"}), 400
        
        video = request.files["video"]
        
        if video.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # Save uploaded video temporarily
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        video.save(temp_input.name)
        temp_input.close()

        try:
            clip = VideoFileClip(temp_input.name)
            
            # Extract metadata
            duration = clip.duration
            width, height = clip.size
            fps = clip.fps if hasattr(clip, 'fps') else 30

            # Generate hashtags based on video characteristics
            hashtags = generate_hashtags_from_analysis(duration, width, height, fps)

            # Clean up
            clip.close()
            
            if os.path.exists(temp_input.name):
                os.remove(temp_input.name)

            return jsonify({
                "hashtags": hashtags,
                "video_metadata": {
                    "duration": duration,
                    "resolution": f"{width}x{height}",
                    "fps": fps
                }
            }), 200

        except Exception as e:
            if os.path.exists(temp_input.name):
                os.remove(temp_input.name)
            print(f"Error processing video: {str(e)}")
            return jsonify({"error": f"Failed to analyze video: {str(e)}"}), 400

    except Exception as e:
        print(f"Error in analyze_hashtags: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


def generate_hashtags_from_analysis(duration, width, height, fps):
    """Generate trending hashtags based on video analysis"""
    hashtags = []

    # Duration-based hashtags
    if duration < 15:
        hashtags.extend(["#Shorts", "#Quick", "#FastClip", "#TikTok", "#Reels"])
    elif duration < 60:
        hashtags.extend(["#Viral", "#Trending", "#Entertainment", "#FYP", "#ForYou"])
    else:
        hashtags.extend(["#LongForm", "#Documentary", "#FullVideo", "#Tutorial"])

    # Resolution-based hashtags
    if width >= 3840 or height >= 2160:
        hashtags.extend(["#4K", "#UltraHD", "#HighQuality", "#CinematicVideo"])
    elif width >= 1920 or height >= 1080:
        hashtags.extend(["#FullHD", "#HD", "#1080p", "#ProQuality"])
    else:
        hashtags.extend(["#SD", "#Mobile", "#Compact"])

    # FPS-based hashtags
    if fps >= 60:
        hashtags.extend(["#Smooth", "#SmoothFrames", "#60FPS", "#HighFPS"])
    elif fps >= 30:
        hashtags.extend(["#Standard", "#Professional", "#30FPS"])
    else:
        hashtags.extend(["#Cinematic", "#SlowMotion"])

    # General trending hashtags
    hashtags.extend([
        "#VideoContent",
        "#ContentCreator",
        "#CreateMore",
        "#SocialMedia",
        "#DigitalCreator",
        "#VideoMarketing",
        "#Engagement",
        "#ViewMore",
        "#MoreEngagement",
        "#ContentMarketing",
        "#Creator",
        "#NewVideo"
    ])

    # Remove duplicates and return
    return list(dict.fromkeys(hashtags))

# ------------------ Merge Videos route ------------------
@app.route("/merge", methods=["POST"])
def merge_videos():
    return jsonify({"error": "Merge Videos feature coming soon"}), 501

# ------------------ Split Video route ------------------
@app.route("/split", methods=["POST"])
def split_video():
    return jsonify({"error": "Split Video feature coming soon"}), 501

# ------------------ Add Watermark route ------------------
@app.route("/watermark", methods=["POST"])
def add_watermark():
    return jsonify({"error": "Add Watermark feature coming soon"}), 501

# ------------------ Change Resolution route ------------------
@app.route("/change-resolution", methods=["POST"])
def change_resolution():
    return jsonify({"error": "Change Resolution feature coming soon"}), 501

# ------------------ Change Format route ------------------
@app.route("/change-format", methods=["POST"])
def change_format():
    return jsonify({"error": "Change Format feature coming soon"}), 501

# ------------------ Compress Video route ------------------
@app.route("/compress", methods=["POST"])
def compress_video():
    return jsonify({"error": "Compress Video feature coming soon"}), 501

# ------------------ Generate Subtitles route ------------------
@app.route("/subtitles", methods=["POST"])
def generate_subtitles():
    return jsonify({"error": "Generate Subtitles feature coming soon"}), 501

# ------------------ Thumbnail Generator route ------------------
@app.route("/thumbnail", methods=["POST"])
def thumbnail_generator():
    return jsonify({"error": "Thumbnail Generator feature coming soon"}), 501

# ------------------ Background Blur route ------------------
@app.route("/blur-background", methods=["POST"])
def blur_background():
    return jsonify({"error": "Background Blur feature coming soon"}), 501

# ------------------ Run server ------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    os.makedirs("static", exist_ok=True)
    app.run(host="0.0.0.0", port=port, debug=True)
