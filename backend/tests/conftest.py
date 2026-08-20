"""pytest configuration — add backend/ to sys.path so `import app` works."""
import os
import sys

# Ensure the backend directory is on the path
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)