"""
Wema Bank Integration Layer
Chooses between mock and real implementation based on environment.
"""

import os
from .mock_client import mock_wema_client

# Try to import real client, fall back to mock if not available
try:
    from .client import WemaBankClient
    # In a real implementation, you would have a real client class
    # For now, we'll use the mock for development
    USE_MOCK = os.getenv('USE_MOCK_WEMA', 'true').lower() == 'true'

    if USE_MOCK:
        wema_client = mock_wema_client
    else:
        # Import and initialize real client when available
        # from .client import WemaBankClient  # Would be the real implementation
        # wema_client = WemaBankClient()
        wema_client = mock_wema_client  # Fallback to mock for now

except ImportError:
    # If there's no real client implementation, use mock
    wema_client = mock_wema_client

__all__ = ['wema_client']