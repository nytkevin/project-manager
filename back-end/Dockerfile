
# 1. Shared Python runtime
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 2. Install dependencies
FROM base AS deps

RUN python -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# 3. Production runtime
FROM base AS runner

ENV PATH="/opt/venv/bin:$PATH" \
    PORT=8000 \
    HOST=0.0.0.0

RUN groupadd --system app \
    && useradd --system --gid app --create-home app

COPY --from=deps /opt/venv /opt/venv

COPY --chown=app:app ./app ./app
#integrate these later after setting up my db
#COPY --chown=app:app ./alembic.ini ./alembic.ini
#COPY --chown=app:app ./alembic ./alembic

USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
