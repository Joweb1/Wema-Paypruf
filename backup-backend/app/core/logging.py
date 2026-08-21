from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from typing import Any

_STANDARD_RECORD_FIELDS = set(logging.makeLogRecord({}).__dict__)
_PUBLIC_TOKEN_PATTERN = re.compile(r"(?P<prefix>/(?:api/public/payments|pay)/)[^/?\s\"']+")


def _redact(value: Any) -> Any:
    if isinstance(value, str):
        return _PUBLIC_TOKEN_PATTERN.sub(r"\g<prefix>[token]", value)
    if isinstance(value, dict):
        return {key: _redact(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact(item) for item in value]
    return value


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": _redact(record.getMessage()),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_RECORD_FIELDS and key not in {"message", "asctime"}:
                payload[key] = _redact(value)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())
    for noisy_logger in ("httpcore", "httpcore2", "httpx", "httpx2", "uvicorn.access"):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)
    if root.handlers:
        for handler in root.handlers:
            handler.setFormatter(JsonFormatter())
        return
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
