# Use official Python image
FROM python:3.11-slim

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

# Copy backend source code
COPY fastapi-backend/app ./app
COPY fastapi-backend/data ./data

# Create necessary directories
RUN mkdir -p data/uploads

# Expose port
EXPOSE 8000

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]