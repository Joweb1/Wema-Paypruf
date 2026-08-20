from __future__ import annotations

import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest
from playwright.sync_api import Page, expect, sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = PROJECT_ROOT / "frontend"
CONFIRMED_RECEIPT = PROJECT_ROOT / "ml" / "fixtures" / "receipt_confirmed_001.png"
SCREENSHOTS = PROJECT_ROOT / "docs" / "screenshots"
RESULTS = PROJECT_ROOT / "test-results" / "e2e"


def _free_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def _wait_for_url(url: str, process: subprocess.Popen[str], timeout: float = 60) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Server stopped before {url} became ready (exit {process.returncode}).")
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status < 500:
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(0.25)
    raise TimeoutError(f"Timed out waiting for {url}.")


def _stop_process_tree(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=8)


def _backend_python() -> Path:
    configured = os.environ.get("PAYPRUF_BACKEND_PYTHON")
    if configured:
        return Path(configured)
    candidates = (
        PROJECT_ROOT / ".venv" / "Scripts" / "python.exe",
        PROJECT_ROOT / ".venv" / "bin" / "python",
        Path(sys.executable),
    )
    return next((path for path in candidates if path.is_file()), Path(sys.executable))


@contextmanager
def _live_application() -> Iterator[str]:
    RESULTS.mkdir(parents=True, exist_ok=True)
    backend_port = _free_port()
    frontend_port = _free_port()
    backend_url = f"http://127.0.0.1:{backend_port}"
    frontend_url = f"http://127.0.0.1:{frontend_port}"
    database_path = (RESULTS / "paypruf-e2e.db").resolve()
    upload_path = (RESULTS / "uploads").resolve()
    database_path.unlink(missing_ok=True)
    shutil.rmtree(upload_path, ignore_errors=True)

    environment = os.environ.copy()
    environment.update(
        {
            "APP_ENV": "test",
            "DATABASE_URL": f"sqlite:///{database_path.as_posix()}",
            "UPLOAD_DIR": str(upload_path),
            "FRONTEND_URL": frontend_url,
            "CORS_ORIGINS": frontend_url,
            "PUBLIC_APP_URL": frontend_url,
            "SEED_DEMO_DATA": "true",
            "WEMA_PROVIDER_MODE": "mock",
            "VITE_API_PROXY_TARGET": backend_url,
            "LOG_LEVEL": "WARNING",
        }
    )
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm:
        raise RuntimeError("npm is required for the browser test.")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for the browser test.")

    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    backend_log = (RESULTS / "backend.log").open("w", encoding="utf-8")
    frontend_log = (RESULTS / "frontend.log").open("w", encoding="utf-8")
    backend = subprocess.Popen(
        [
            str(_backend_python()),
            "-m",
            "uvicorn",
            "backend.app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(backend_port),
        ],
        cwd=PROJECT_ROOT,
        env=environment,
        stdout=backend_log,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=creation_flags,
    )
    build = subprocess.run(
        [npm, "run", "build"],
        cwd=FRONTEND_ROOT,
        env=environment,
        stdout=frontend_log,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
        creationflags=creation_flags,
    )
    if build.returncode:
        _stop_process_tree(backend)
        frontend_log.close()
        backend_log.close()
        raise RuntimeError(f"Frontend build failed with exit code {build.returncode}.")
    frontend = subprocess.Popen(
        [
            node,
            str(FRONTEND_ROOT / "node_modules" / "vite" / "bin" / "vite.js"),
            "preview",
            "--configLoader",
            "runner",
            "--host",
            "127.0.0.1",
            "--port",
            str(frontend_port),
            "--strictPort",
        ],
        cwd=FRONTEND_ROOT,
        env=environment,
        stdout=frontend_log,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=creation_flags,
    )
    try:
        _wait_for_url(f"{backend_url}/api/health", backend)
        _wait_for_url(f"{frontend_url}/dashboard", frontend)
        yield frontend_url
    finally:
        _stop_process_tree(frontend)
        _stop_process_tree(backend)
        frontend_log.close()
        backend_log.close()


def _assert_no_horizontal_overflow(page: Page) -> None:
    dimensions = page.evaluate(
        """() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        })"""
    )
    assert dimensions["content"] <= dimensions["viewport"], dimensions


@pytest.mark.e2e
def test_confirmed_payment_golden_path() -> None:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    with _live_application() as base_url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        browser_errors: list[str] = []
        page.on("console", lambda message: browser_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: browser_errors.append(str(error)))

        page.goto(f"{base_url}/dashboard", wait_until="networkidle")
        expect(page.get_by_role("heading", name=re.compile("Good to see you"))).to_be_visible()
        _assert_no_horizontal_overflow(page)
        page.screenshot(path=SCREENSHOTS / "dashboard.png", full_page=True)

        page.get_by_role("button", name="Create payment").first.click()
        page.get_by_label("Customer name").fill("E2E Confirmed Customer")
        page.get_by_label(re.compile(r"^Amount")).fill("25000")
        page.get_by_label("Description").fill("Golden-path payment")
        page.get_by_role("button", name="Generate PayPruf link").click()

        expect(page).to_have_url(re.compile(r"/payment-link/[0-9a-f-]+$"))
        expect(page.get_by_role("heading", name=re.compile("Share this request"))).to_be_visible()
        page.get_by_role("link", name="Open customer page").click()
        expect(page).to_have_url(re.compile(r"/pay/[^/?]+$"))
        expect(page.get_by_role("heading", name="₦25,000")).to_be_visible()
        dismiss_toast = page.get_by_role("button", name="Dismiss notification")
        if dismiss_toast.is_visible():
            dismiss_toast.click()

        page.set_viewport_size({"width": 390, "height": 844})
        _assert_no_horizontal_overflow(page)
        page.screenshot(path=SCREENSHOTS / "customer-payment-mobile.png", full_page=True)

        page.locator('input[type="file"]').set_input_files(CONFIRMED_RECEIPT)
        page.get_by_role("button", name="Verify payment").click()
        expect(page).to_have_url(re.compile(r"/verification/[0-9a-f-]+\?token="), timeout=120_000)
        expect(page.get_by_role("heading", name="Payment confirmed")).to_be_visible(timeout=120_000)

        page.set_viewport_size({"width": 1440, "height": 1000})
        _assert_no_horizontal_overflow(page)
        page.screenshot(path=SCREENSHOTS / "verification-confirmed.png", full_page=True)

        page.goto(f"{base_url}/dashboard", wait_until="networkidle")
        page.get_by_placeholder("Search payments").fill("E2E Confirmed Customer")
        matching_row = page.get_by_role("row").filter(has_text="E2E Confirmed Customer")
        expect(matching_row).to_contain_text("Confirmed")
        page.screenshot(path=SCREENSHOTS / "dashboard-confirmed.png", full_page=True)

        assert browser_errors == []
        browser.close()
