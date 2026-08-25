# Use official Python image
FROM python:3.12-slim

# Set working directory (inside container)
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend directory
COPY fastapi-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all code from backend directory (including alembic, app, data, etc.)
COPY fastapi-backend/ .

# Create necessary directories
RUN mkdir -p data/uploads

# Set default port if PORT env var is not set by host
ENV PORT=8000
EXPOSE ${PORT}

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Run Uvicorn bound to dynamic $PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
