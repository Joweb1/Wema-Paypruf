"""Pytest fixtures and configuration."""

from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.seed.initial_data import seed_initial_data

# Use a test SQLite database
TEST_DB_URL = "sqlite:///./data/test_paypruf.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create and seed tables once for testing session."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./data/test_paypruf.db"):
        try:
            os.remove("./data/test_paypruf.db")
        except Exception:
            pass


@pytest.fixture
def db_session():
    """Yield a database session per test function."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Login as demo merchant and return Authorization Bearer header."""
    res = client.post("/api/v1/auth/demo-login")
    assert res.status_code == 200
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}
