import os
import logging

logger = logging.getLogger(__name__)

_firebase_initialized = False

def initialize_firebase():
    """Initialize Firebase Admin SDK (only once). Gracefully skip if no credentials."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    import firebase_admin
    from firebase_admin import credentials, firestore, storage, auth as firebase_auth
    from config import Config

    cred_path = Config.GOOGLE_APPLICATION_CREDENTIALS
    if not cred_path or not os.path.isfile(cred_path):
        logger.warning(
            "Firebase credentials not found at %s — skipping Firebase init. "
            "Firebase-dependent features will be unavailable.",
            cred_path
        )
        _firebase_initialized = True
        return

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': Config.FIREBASE_STORAGE_BUCKET
    })
    _firebase_initialized = True

# Get Firestore client
def get_firestore():
    initialize_firebase()
    from firebase_admin import firestore
    return firestore.client()

# Get Storage bucket
def get_storage_bucket():
    initialize_firebase()
    from firebase_admin import storage
    return storage.bucket()

# Get Auth client
def get_auth():
    initialize_firebase()
    from firebase_admin import auth
    return auth