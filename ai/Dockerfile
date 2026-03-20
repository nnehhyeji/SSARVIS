FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.6 /uv /usr/local/bin/uv

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libopus0 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev

COPY app ./app
COPY new-api.md ./new-api.md

# 보안: non-root 유저 설정
RUN groupadd -r fastapi && useradd -r -g fastapi fastapi \
    && chown -R fastapi:fastapi /app
USER fastapi

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
