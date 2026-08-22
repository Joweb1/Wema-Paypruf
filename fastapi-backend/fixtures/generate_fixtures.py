"""Generate generic synthetic receipts with no real bank branding or data."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path(__file__).resolve().parent
WIDTH = 1200
HEIGHT = 1600


@dataclass(frozen=True, slots=True)
class ReceiptSpec:
    scenario: str
    reference: str
    amount: str
    sender: str
    status: str
    time: str


SPECS = (
    ReceiptSpec("confirmed", "PAYPRUF-DEMO-001", "25,000.00", "Chinedu Okafor", "Successful", "17:42:00"),
    ReceiptSpec("mismatch", "PAYPRUF-DEMO-002", "25,000.00", "Aisha Bello", "Successful", "17:48:00"),
    ReceiptSpec("not-received", "PAYPRUF-DEMO-003", "15,000.00", "Tolu Adeyemi", "Successful", "17:54:00"),
    ReceiptSpec("pending", "PAYPRUF-DEMO-004", "30,000.00", "Ife Obi", "Processing", "18:02:00"),
)


def _font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        "arialbd.ttf" if bold else "arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _create_receipt(spec: ReceiptSpec) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#fbfaf7")
    draw = ImageDraw.Draw(image)
    brand = "#a9002d"
    ink = "#202124"
    muted = "#62656a"

    draw.rounded_rectangle((88, 72, WIDTH - 88, HEIGHT - 72), radius=24, fill="white", outline="#dedbd5", width=3)
    draw.rounded_rectangle((88, 72, WIDTH - 88, 290), radius=24, fill=brand)
    draw.rectangle((88, 240, WIDTH - 88, 290), fill=brand)
    draw.text((150, 125), "PAYPRUF DEMO", font=_font(52, bold=True), fill="white")
    draw.text((150, 205), "PAYMENT TRANSFER RECEIPT", font=_font(29, bold=True), fill="#fff3f5")

    y = 355
    draw.text((150, y), "Demo Bank", font=_font(42, bold=True), fill=ink)
    y += 92
    draw.line((150, y, WIDTH - 150, y), fill="#e4e0da", width=3)
    y += 60

    fields = (
        f"Status: {spec.status}",
        f"Amount: NGN {spec.amount}",
        f"Transaction Reference: {spec.reference}",
        "Date: 2026-08-19",
        f"Time: {spec.time}",
        f"Sender: {spec.sender}",
        "Recipient: Tola Fashion",
        "Bank: Demo Bank",
        "Account: ****6789",
    )
    for field in fields:
        draw.text((150, y), field, font=_font(35), fill=ink)
        y += 84

    draw.line((150, y + 8, WIDTH - 150, y + 8), fill="#e4e0da", width=3)
    draw.text((150, y + 65), "SYNTHETIC TEST RECEIPT", font=_font(28, bold=True), fill=brand)
    draw.text((150, y + 112), "No real payment. No real customer or account.", font=_font(25), fill=muted)
    return image


def generate(output_dir: Path = OUTPUT_DIR) -> list[Path]:
    """Regenerate all deterministic receipt fixtures and their manifest."""

    output_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []
    manifest: list[dict[str, str]] = []
    rendered: dict[str, Image.Image] = {}

    for spec in SPECS:
        image = _create_receipt(spec)
        rendered[spec.reference] = image
        filename = f"receipt_{spec.scenario.replace('-', '_')}_{spec.reference[-3:]}.png"
        path = output_dir / filename
        image.save(path, format="PNG", optimize=True)
        generated.append(path)
        manifest.append({**asdict(spec), "filename": filename, "mime_type": "image/png"})

    jpeg_path = output_dir / "receipt_mismatch_PAYPRUF-DEMO-002.jpg"
    rendered["PAYPRUF-DEMO-002"].save(jpeg_path, format="JPEG", quality=94, optimize=True)
    generated.append(jpeg_path)

    pdf_path = output_dir / "receipt_confirmed_PAYPRUF-DEMO-001.pdf"
    rendered["PAYPRUF-DEMO-001"].save(pdf_path, format="PDF", resolution=150.0)
    generated.append(pdf_path)

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    generated.append(manifest_path)
    return generated


if __name__ == "__main__":
    for generated_path in generate():
        print(generated_path)
