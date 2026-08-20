import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Firebase
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    GCP_PROJECT = os.getenv('GCP_PROJECT')
    FIREBASE_STORAGE_BUCKET = os.getenv('FIREBASE_STORAGE_BUCKET')

    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    # File upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
    UPLOAD_PATH = '/tmp/uploads'

# Environment detection
ENV = os.getenv('WEMAPAYPRUF_ENV', 'development')
DEBUG = ENV == 'development'