from firebase_admin import storage
from app.firebase import get_storage_bucket
import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self._bucket = None

    @property
    def bucket(self):
        if self._bucket is None:
            self._bucket = get_storage_bucket()
        return self._bucket

    def upload_file(self, file_content: bytes, filename: str, content_type: str) -> Optional[str]:
        """
        Upload a file to Firebase Storage.
        Returns the public URL if successful, None otherwise.
        """
        try:
            # Generate a unique filename to avoid collisions
            file_extension = filename.split('.')[-1] if '.' in filename else ''
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}" if file_extension else uuid.uuid4().hex

            # Create a blob and upload the file
            blob = self.bucket.blob(unique_filename)
            blob.upload_from_string(file_content, content_type=content_type)

            # Make the blob publicly accessible
            blob.make_public()

            logger.info(f"Uploaded file to: {blob.public_url}")
            return blob.public_url
        except Exception as e:
            logger.error(f"Error uploading file {filename}: {e}")
            return None

    def delete_file(self, filename: str) -> bool:
        """
        Delete a file from Firebase Storage.
        Returns True if successful, False otherwise.
        """
        try:
            blob = self.bucket.blob(filename)
            blob.delete()
            logger.info(f"Deleted file: {filename}")
            return True
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {e}")
            return False

# Singleton instance
storage_service = StorageService()