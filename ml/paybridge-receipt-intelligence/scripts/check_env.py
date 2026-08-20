"""Verify the Receipt Intelligence environment is set up.

Run:  python scripts/check_env.py
Exits 0 if OK. Does NOT call any external API.

Checks:
  - core Python deps import
  - google-genai SDK importable
  - .env presence + GOOGLE_API_KEY (warns if not set)
"""

from __future__ import annotations

import os
import sys


def _check_import(name: str) -> bool:
    try:
        __import__(name)
        print(f"  [ok]      {name}")
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  [MISSING] {name}: {e}")
        return False


def main() -> int:
    print("PayBridge Receipt Intelligence — environment check\n")

    deps = ["fastapi", "uvicorn", "pydantic", "PIL", "dotenv", "httpx"]
    ok = all(_check_import(d) for d in deps)

    # google-genai (the unified SDK) imports as `from google import genai`
    try:
        from google import genai  # noqa: F401

        print("  [ok]      google.genai (google-genai SDK)")
    except Exception as e:  # noqa: BLE001
        print(f"  [MISSING] google.genai: {e}")
        ok = False

    # .env / config
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except Exception:  # noqa: BLE001
        pass

    key = os.getenv("GOOGLE_API_KEY", "")
    if key:
        print(f"  [ok]      GOOGLE_API_KEY set ({len(key)} chars)")
    else:
        print("  [warn]    GOOGLE_API_KEY not set — live extraction will fail until added to .env")

    model = os.getenv("RECEIPT_MODEL", "gemini-2.0-flash")
    print(f"  [info]    RECEIPT_MODEL = {model}")

    print(
        "\n"
        + ("OK — environment ready.\n" if ok else "INCOMPLETE — install requirements.txt and/or set .env\n")
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
