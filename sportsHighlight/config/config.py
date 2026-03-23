import os

UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'webm'}
MAX_CONTENT_LENGTH = 4 * 1024 * 1024 * 1024  # 4 GB (large videos)

# Chunking settings
CHUNK_DURATION_SEC = 300      # 5 minutes per chunk
CHUNK_OVERLAP_SEC = 15        # 15 seconds overlap between chunks
