# Production image: the backend under waitress, serving the frontend built in the first stage.
# Base images are pinned by digest; bump the tag and digest together.

FROM node:24.22.1-trixie-slim@sha256:89c5244bc22a9bc3287d89ebc7e49b9cb5bb84cd40e6175ac3421d5a9f68b95a AS frontend
WORKDIR /src/front
COPY front/package.json front/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY front/ ./
RUN npm run build

FROM python:3.14.9-slim-trixie@sha256:35caba83af2fe6da9a5d922f9b0156f21d1246a48278c58a08bd253303ba42e8
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore
RUN useradd --system --user-group --uid 10001 --no-create-home --home-dir /nonexistent raclotto
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY alembic.ini ./
COPY back/__init__.py back/
COPY back/migrations back/migrations
COPY back/src back/src
COPY --from=frontend /src/front/build static
# The app's files stay root-owned and read-only to it; only instance/ (database, log) is writable.
RUN python -m compileall -q back \
    && mkdir instance \
    && chown raclotto:raclotto instance
# The version /api/health reports: CI passes the release tag; any other build is dev.
ARG RACLOTTO_VERSION=dev
RUN printf '%s\n' "$RACLOTTO_VERSION" > VERSION
USER raclotto
ENV RACLOTTO_HOST=0.0.0.0 \
    RACLOTTO_PORT=8081 \
    RACLOTTO_DATABASE_URL=sqlite:////app/instance/raclotto.db
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request as r; r.urlopen(r.Request('http://127.0.0.1:8081/api/health', headers={'Accept': 'application/json'}), timeout=4)"]
CMD ["python", "-m", "back.src.main"]
