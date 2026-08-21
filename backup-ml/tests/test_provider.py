from types import SimpleNamespace

from PIL import Image

from ml.extraction.providers import RapidOCRProvider


class _EngineWithBlankLine:
    def __call__(self, _image: object) -> SimpleNamespace:
        return SimpleNamespace(txts=("first", "  ", "second"), scores=(0.9, 0.1, 0.7))


def test_rapidocr_provider_keeps_scores_paired_when_blank_text_is_filtered() -> None:
    result = RapidOCRProvider(engine=_EngineWithBlankLine()).recognize(Image.new("RGB", (20, 20), "white"))

    assert result.lines == ("first", "second")
    assert result.scores == (0.9, 0.7)
