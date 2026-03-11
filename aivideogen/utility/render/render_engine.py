import time
import os
import tempfile
import zipfile
import platform
import subprocess
from moviepy.editor import (AudioFileClip, CompositeVideoClip, CompositeAudioClip, ImageClip,
                            TextClip, VideoFileClip)
from moviepy.audio.fx.audio_loop import audio_loop
from moviepy.audio.fx.audio_normalize import audio_normalize
import requests

def download_file(url, filename):
    with open(filename, 'wb') as f:
        headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers)
        f.write(response.content)

def search_program(program_name):
    try: 
        search_cmd = "where" if platform.system() == "Windows" else "which"
        return subprocess.check_output([search_cmd, program_name]).decode().strip()
    except subprocess.CalledProcessError:
        return None

def get_program_path(program_name):
    program_path = search_program(program_name)
    return program_path


def get_output_media(audio_file_path, timed_captions, background_image_data, image_server):
    OUTPUT_FILE_NAME = "rendered_video.mp4"

    # Configure ImageMagick path
    magick_path = get_program_path("magick")
    os.environ["IMAGEMAGICK_BINARY"] = magick_path if magick_path else "/usr/bin/convert"

    visual_clips = []

    for (t1, t2), image_url in background_image_data:
        image_filename = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False).name
        download_file(image_url, image_filename)

        duration = t2 - t1
        image_clip = ImageClip(image_filename).set_duration(duration)
        image_clip = image_clip.set_start(t1).resize(height=1080).set_position("center")
        visual_clips.append(image_clip)

    # Add subtitles (TextClips)
    for (t1, t2), text in timed_captions:
        try:
            text_clip = TextClip(
                txt=text,
                fontsize=60,
                color="white",
                stroke_width=2,
                stroke_color="black",
                method="caption",  # fallback to avoid ImageMagick if needed
                size=(1600, None)
            )
            text_clip = text_clip.set_start(t1).set_end(t2).set_position(("center", 900))
            visual_clips.append(text_clip)
        except Exception as e:
            print(f"TextClip error: {e}")

    # Combine visual layers
    video = CompositeVideoClip(visual_clips)

    # Add audio
    audio_clip = AudioFileClip(audio_file_path)
    video = video.set_audio(audio_clip)
    video = video.set_duration(audio_clip.duration)

    # Export
    video.write_videofile(OUTPUT_FILE_NAME, codec="libx264", audio_codec="aac", fps=25, preset="veryfast")

    # Clean up
    for (_, _), image_url in background_image_data:
        try:
            os.remove(image_filename)
        except Exception as e:
            print(f"Error deleting {image_filename}: {e}")

    return OUTPUT_FILE_NAME