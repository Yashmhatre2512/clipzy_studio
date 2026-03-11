import os

from dotenv import load_dotenv


load_dotenv()

UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'webm'}
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max upload size
CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID', '')
CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET', '')
REDIRECT_URI = os.getenv('YOUTUBE_REDIRECT_URI', 'http://localhost:5000/oauth2callback')
YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/yt-analytics.readonly']