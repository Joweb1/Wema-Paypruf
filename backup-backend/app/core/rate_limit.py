from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request

from backend.app.core.errors import AppError


class RateLimiter:
    """Minimal in-memory sliding-window limiter keyed by client identity.

    This is sufficient for an MVP deployed behind a single process. A multi-worker
    or horizontally scaled deployment should swap this for a shared store (Redis).
    """

    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        host = request.client.host if request.client else "unknown"
        return host

    def check(self, request: Request) -> None:
        key = self._client_key(request)
        now = time.monotonic()
        window = self._hits[key]
        while window and window[0] <= now - self.window_seconds:
            window.popleft()
        if len(window) >= self.max_requests:
            retry_after = max(1, int(self.window_seconds - (now - window[0])))
            raise AppError(
                429,
                "RATE_LIMITED",
                "Too many attempts. Please wait a moment before trying again.",
                {"retry_after_seconds": retry_after},
            )
        window.append(now)
