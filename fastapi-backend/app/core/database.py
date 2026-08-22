"""Database connection and session factory supporting PostgreSQL (local/Supabase) and SQLite."""

from __future__ import annotations

from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

# Format connection URL for SQLAlchemy
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Connection arguments
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create SQLAlchemy engine
engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base model
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def auto_migrate_columns() -> None:
    """Safely add any missing columns to existing tables dynamically."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "receipts" in tables:
            existing_cols = {col["name"] for col in inspector.get_columns("receipts")}
            receipt_cols_to_add = [
                ("sender_account", "VARCHAR(64)"),
                ("transaction_time", "VARCHAR(32)"),
                ("field_evidence_json", "TEXT"),
                ("authenticity_indicators_json", "TEXT"),
                ("missing_fields_json", "TEXT"),
                ("backend_validation_status", "VARCHAR(64) DEFAULT 'VALID_CLAIM'"),
                ("ai_engine", "VARCHAR(32) DEFAULT 'GEMINI_VISION'"),
                ("ai_offline", "BOOLEAN DEFAULT 0"),
                ("ai_status_message", "VARCHAR(255)"),
                ("originality_score", "FLOAT DEFAULT 0.95"),
                ("tampering_detected", "BOOLEAN DEFAULT 0"),
                ("authenticity_verdict", "VARCHAR(32) DEFAULT 'GENUINE'"),
            ]
            with engine.connect() as conn:
                for col_name, col_type in receipt_cols_to_add:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE receipts ADD COLUMN {col_name} {col_type}"))
                conn.commit()
    except Exception:
        pass


def init_db() -> None:
    """Create all database tables and perform column migrations."""
    Base.metadata.create_all(bind=engine)
    auto_migrate_columns()
