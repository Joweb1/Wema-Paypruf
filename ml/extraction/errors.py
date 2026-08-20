"""Safe, actionable errors raised by receipt intelligence."""

from __future__ import annotations

from typing import Any


class ReceiptExtractionError(Exception):
    """A receipt could not be safely converted into structured evidence."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details

    def as_dict(self) -> dict[str, Any]:
        """Return a value suitable for the API's standard error envelope."""

        return {"code": self.code, "message": self.message, "details": self.details}
