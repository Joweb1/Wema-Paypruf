"""OCR provider abstraction and the production RapidOCR implementation."""

from __future__ import annotations

from typing import Any, Protocol

from PIL import Image

from .errors import ReceiptExtractionError
from .models import OCRResult


class OCRProvider(Protocol):
    def recognize(self, image: Image.Image) -> OCRResult:
        """Return provider-neutral text lines and confidence scores."""


class RapidOCRProvider:
    """Lazy RapidOCR/ONNX Runtime provider.

    Lazy construction avoids loading OCR models during normal API imports and
    keeps startup errors inside the module's safe error contract.
    """

    def __init__(self, engine: Any | None = None) -> None:
        self._engine = engine

    def _get_engine(self) -> Any:
        if self._engine is not None:
            return self._engine
        try:
            from rapidocr import RapidOCR

            self._engine = RapidOCR()
            return self._engine
        except Exception as exc:
            raise ReceiptExtractionError(
                "OCR_UNAVAILABLE",
                "Receipt reading is temporarily unavailable. Please try again shortly.",
            ) from exc

    def recognize(self, image: Image.Image) -> OCRResult:
        try:
            import numpy as np

            result = self._get_engine()(np.asarray(image.convert("RGB")))
            raw_texts = tuple(result.txts or ())
            raw_scores = tuple(float(value) for value in (result.scores or ()))
            pairs = []
            for index, value in enumerate(raw_texts):
                text = str(value).strip()
                if text:
                    score = raw_scores[index] if index < len(raw_scores) else 0.0
                    pairs.append((text, score))
            texts = tuple(text for text, _ in pairs)
            scores = tuple(score for _, score in pairs)
        except ReceiptExtractionError:
            raise
        except Exception as exc:
            raise ReceiptExtractionError(
                "OCR_FAILED",
                "PayPruf could not read this receipt. Try a clearer, upright image.",
            ) from exc

        if not texts:
            raise ReceiptExtractionError(
                "OCR_NO_TEXT",
                "No readable receipt text was found. Try a sharper image with better lighting.",
            )
        return OCRResult(lines=texts, scores=scores)
