import json
import logging

from backend.app.core.logging import JsonFormatter, configure_logging


def test_json_logging_redacts_public_tokens() -> None:
    record = logging.LogRecord(
        name="httpx",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="GET http://test/api/public/payments/super-secret-token/receipt/file",
        args=(),
        exc_info=None,
    )
    record.path = "/pay/customer-secret?source=test"

    payload = json.loads(JsonFormatter().format(record))

    assert "super-secret-token" not in payload["message"]
    assert "customer-secret" not in payload["path"]
    assert "/api/public/payments/[token]/receipt/file" in payload["message"]
    assert payload["path"] == "/pay/[token]?source=test"


def test_request_library_info_logs_are_quiet() -> None:
    configure_logging("INFO")

    assert logging.getLogger("httpx").level == logging.WARNING
    assert logging.getLogger("httpx2").level == logging.WARNING
    assert logging.getLogger("httpcore").level == logging.WARNING
    assert logging.getLogger("httpcore2").level == logging.WARNING
    assert logging.getLogger("uvicorn.access").level == logging.WARNING
