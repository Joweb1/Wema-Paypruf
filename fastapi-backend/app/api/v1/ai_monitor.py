"""Real-time AI Health Monitor & Multi-Key Diagnostic Controller."""

from __future__ import annotations

import time
import json
import base64
import urllib.request
import urllib.error
import requests
from io import BytesIO
from PIL import Image, ImageDraw
from typing import Any, Dict, List
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


def _create_micro_test_image() -> str:
    """Generate a tiny base64 PNG test badge for live AI ping checks."""
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10, 30), "PAYPRUF AI HEALTH CHECK", fill=(0, 0, 0))
    d.text((10, 50), "Amount: NGN 1,000.00", fill=(0, 0, 0))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@router.get("/status")
def get_ai_status() -> Dict[str, Any]:
    """Return summary configuration of primary and backup AI providers."""
    gemini_keys = settings.get_gemini_keys()
    masked_gemini = [
        {"index": i + 1, "masked_key": f"{k[:8]}...{k[-6:]}" if len(k) > 14 else "INVALID"}
        for i, k in enumerate(gemini_keys)
    ]
    nvidia_configured = bool(settings.NVIDIA_API_KEY and settings.NVIDIA_API_KEY.strip())
    masked_nvidia = (
        f"{settings.NVIDIA_API_KEY[:10]}...{settings.NVIDIA_API_KEY[-6:]}"
        if nvidia_configured
        else "NOT_CONFIGURED"
    )

    return {
        "status": "HEALTHY" if gemini_keys or nvidia_configured else "OFFLINE",
        "primary_engine": "GEMINI_VISION",
        "primary_model": settings.GEMINI_MODEL,
        "gemini_keys_count": len(gemini_keys),
        "gemini_keys": masked_gemini,
        "backup_engine": "NVIDIA_VISION",
        "backup_model": settings.NVIDIA_MODEL,
        "nvidia_configured": nvidia_configured,
        "nvidia_key_masked": masked_nvidia,
        "fallback_engine": "LOCAL_RAPID_OCR",
    }


@router.post("/test-live")
def test_live_ai_keys() -> Dict[str, Any]:
    """Execute live pings across all configured Gemini keys and NVIDIA models.
    
    Returns exact status code, error details, and response latency.
    """
    b64_img = _create_micro_test_image()
    results: List[Dict[str, Any]] = []

    # 1. Test Google Gemini Keys
    gemini_keys = settings.get_gemini_keys()
    models_to_test = [settings.GEMINI_MODEL, "gemini-3.5-flash", "gemini-flash-lite-latest"]
    unique_models = []
    for m in models_to_test:
        if m and m not in unique_models:
            unique_models.append(m)

    payload_json = json.dumps({
        "contents": [{
            "parts": [
                {"text": 'Extract JSON: {"status": "OK"}'},
                {"inline_data": {"mime_type": "image/png", "data": b64_img}}
            ]
        }],
        "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}
    }).encode("utf-8")

    for i, key in enumerate(gemini_keys):
        masked = f"{key[:8]}...{key[-6:]}" if len(key) > 14 else "KEY"
        key_entry = {
            "provider": "Google Gemini Vision",
            "tier": "Primary" if i == 0 else f"Backup Key #{i}",
            "key_index": i + 1,
            "key_masked": masked,
            "status": "UNKNOWN",
            "active_model": None,
            "latency_ms": None,
            "error_detail": None,
            "healthy": False,
        }

        # Try models for this key
        for m in unique_models:
            t0 = time.time()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
            req = urllib.request.Request(url, data=payload_json, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=8) as resp:
                    elapsed = int((time.time() - t0) * 1000)
                    key_entry["status"] = "ACTIVE (200 OK)"
                    key_entry["active_model"] = m
                    key_entry["latency_ms"] = elapsed
                    key_entry["healthy"] = True
                    break
            except urllib.error.HTTPError as e:
                err_text = e.read().decode("utf-8")[:120].replace("\n", " ")
                key_entry["status"] = f"HTTP {e.code}"
                key_entry["error_detail"] = f"Code {e.code}: {err_text}"
            except Exception as e:
                key_entry["status"] = "TIMEOUT / NETWORK"
                key_entry["error_detail"] = str(e)[:120]

        results.append(key_entry)

    # 2. Test NVIDIA Cloud Vision
    if settings.NVIDIA_API_KEY:
        nv_masked = f"{settings.NVIDIA_API_KEY[:10]}...{settings.NVIDIA_API_KEY[-6:]}"
        nv_entry = {
            "provider": "NVIDIA Cloud Vision",
            "tier": "Secondary Failover",
            "key_index": 1,
            "key_masked": nv_masked,
            "status": "UNKNOWN",
            "active_model": settings.NVIDIA_MODEL,
            "latency_ms": None,
            "error_detail": None,
            "healthy": False,
        }

        nv_url = f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions"
        nv_headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        nv_payload = {
            "model": settings.NVIDIA_MODEL or "meta/llama-3.2-11b-vision-instruct",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": 'Respond ONLY with JSON: {"status": "OK"}'},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
                ]
            }],
            "temperature": 0.1,
            "max_tokens": 100
        }

        t0 = time.time()
        try:
            resp = requests.post(nv_url, headers=nv_headers, json=nv_payload, timeout=12)
            elapsed = int((time.time() - t0) * 1000)
            if resp.status_code == 200:
                nv_entry["status"] = "ACTIVE (200 OK)"
                nv_entry["latency_ms"] = elapsed
                nv_entry["healthy"] = True
            else:
                nv_entry["status"] = f"HTTP {resp.status_code}"
                nv_entry["error_detail"] = resp.text[:120].replace("\n", " ")
        except Exception as e:
            nv_entry["status"] = "TIMEOUT / NETWORK"
            nv_entry["error_detail"] = str(e)[:120]

        results.append(nv_entry)

    active_count = sum(1 for r in results if r["healthy"])
    return {
        "timestamp": time.time(),
        "total_providers_tested": len(results),
        "active_healthy_count": active_count,
        "overall_status": "OPERATIONAL" if active_count > 0 else "DEGRADED_LOCAL_ONLY",
        "diagnostics": results
    }
