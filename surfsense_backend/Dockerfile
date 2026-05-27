# syntax=docker/dockerfile:1
# Build with BuildKit so pip/uv/playwright caches persist across rebuilds:
#   DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.dev.yml build backend
#
# Dependency layers rebuild only when pyproject.toml or uv.lock change.
# Application code is copied in a late, fast layer (editable install, --no-deps).

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies including SSL tools, CUDA dependencies, and Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    ca-certificates \
    curl \
    wget \
    unzip \
    gnupg2 \
    espeak-ng \
    libsndfile1 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    dos2unix \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Pandoc 3.x from GitHub as a fallback for Linux where pypandoc_binary
# may not bundle pandoc (apt ships 2.17 which has broken table rendering).
RUN ARCH=$(dpkg --print-architecture) && \
    wget -qO /tmp/pandoc.deb "https://github.com/jgm/pandoc/releases/download/3.9/pandoc-3.9-1-${ARCH}.deb" && \
    dpkg -i /tmp/pandoc.deb && \
    rm /tmp/pandoc.deb

RUN update-ca-certificates

# Static uv binary (avoids re-downloading uv via pip when dependency layer rebuilds)
COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/

ENV UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# --- Python dependencies (cached unless lockfiles change) ---------------------
COPY pyproject.toml uv.lock ./

# Set to 1 only when the container needs CUDA PyTorch (GPU passthrough).
# Default uses torch from uv.lock (CPU wheels) — avoids a second multi-GB download.
ARG PYTORCH_CUDA=0

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    pip install --upgrade certifi pip-system-certs && \
    if [ "$PYTORCH_CUDA" = "1" ] && [ "$(uname -m)" = "x86_64" ]; then \
        uv pip install --system torch torchvision torchaudio \
            --index-url https://download.pytorch.org/whl/cu121; \
    fi && \
    uv sync --frozen --no-install-project --no-dev

# SSL env (certifi path is stable after deps layer)
RUN CERTIFI_PATH=$(python -c "import certifi; print(certifi.where())") && \
    echo "export SSL_CERT_FILE=$CERTIFI_PATH" >> /root/.bashrc && \
    echo "export REQUESTS_CA_BUNDLE=$CERTIFI_PATH" >> /root/.bashrc
ENV SSL_CERT_FILE=/usr/local/lib/python3.12/site-packages/certifi/cacert.pem
ENV REQUESTS_CA_BUNDLE=/usr/local/lib/python3.12/site-packages/certifi/cacert.pem

# --- Heavy runtime assets (separate layer; rarely changes) --------------------
RUN mkdir -p /root/.EasyOCR/model && \
    wget --no-check-certificate https://github.com/JaidedAI/EasyOCR/releases/download/v1.3/english_g2.zip -O /root/.EasyOCR/model/english_g2.zip || true && \
    wget --no-check-certificate https://github.com/JaidedAI/EasyOCR/releases/download/pre-v1.1.6/craft_mlt_25k.zip -O /root/.EasyOCR/model/craft_mlt_25k.zip || true && \
    cd /root/.EasyOCR/model && (unzip -o english_g2.zip || true) && (unzip -o craft_mlt_25k.zip || true)

RUN --mount=type=cache,target=/root/.cache/huggingface,sharing=locked \
    python -c "try:\n    from docling.document_converter import DocumentConverter\n    conv = DocumentConverter()\nexcept:\n    pass" || true

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    --mount=type=cache,target=/root/.cache/ms-playwright,sharing=locked \
    uv pip install --system playwright && \
    playwright install chromium --with-deps

# --- Application (fast layer; dev compose bind-mounts over app/) ------------
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts
COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv pip install --system --no-deps -e .

# Entrypoint
COPY scripts/docker/entrypoint.sh /app/scripts/docker/entrypoint.sh
RUN dos2unix /app/scripts/docker/entrypoint.sh && chmod +x /app/scripts/docker/entrypoint.sh

RUN mkdir -p /shared_tmp
ENV TMPDIR=/shared_tmp
ENV PYTHONPATH=/app
ENV UVICORN_LOOP=asyncio
ENV MALLOC_MMAP_THRESHOLD_=65536
ENV MALLOC_TRIM_THRESHOLD_=131072
ENV MALLOC_MMAP_MAX_=65536
ENV SERVICE_ROLE=all
ENV CELERY_MAX_WORKERS=10
ENV CELERY_MIN_WORKERS=2
ENV CELERY_MAX_TASKS_PER_CHILD=50
ENV CELERY_QUEUES=""

EXPOSE 8000-8001
CMD ["/app/scripts/docker/entrypoint.sh"]
