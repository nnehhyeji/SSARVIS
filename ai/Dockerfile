FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.6 /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY main.py ./

# 보안: non-root 유저 설정
RUN groupadd -r fastapi && useradd -r -g fastapi fastapi \
    && chown -R fastapi:fastapi /app
USER fastapi

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
