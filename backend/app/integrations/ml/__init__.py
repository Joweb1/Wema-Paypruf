"""
ML Integration Layer
Chooses between mock and real implementation based on environment.
"""

from .client import ml_client

__all__ = ['ml_client']