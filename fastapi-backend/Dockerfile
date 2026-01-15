FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for document processing
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create temp directory for file processing
RUN mkdir -p /tmp/jsonl_generator

# DO NOT hardcode port
EXPOSE 8000

# IMPORTANT: shell form so $PORT works
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
