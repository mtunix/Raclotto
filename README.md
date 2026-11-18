# Raclotto

Made for snack lovers by snack lovers <3

## Developing

```bash
python -m venv venv && venv/bin/pip install -r requirements-dev.txt
venv/bin/python -m back.src.dev     # Flask debug server on 127.0.0.1:8081
cd front && npm ci && npm start     # proxies the API to it
```

`.env.example` lists every variable; copy it to `.env` to set any.

## Deploying with Docker

What you need: a server with Docker and Docker Compose, and a domain pointing at it.
[Caddy](https://caddyserver.com) answers on ports 80 and 443 and gets the HTTPS certificate on its own.

```bash
git clone https://github.com/mtunix/Raclotto raclotto && cd raclotto
cp .env.example .env    # set RACLOTTO_DOMAIN and RACLOTTO_JWT_SECRET, and RACLOTTO_ADMIN_PASSWORD for the first start
docker compose up -d
```

CI builds the image on every green push to `master` and publishes it as
`ghcr.io/mtunix/raclotto:latest` and `:<commit sha>`. The server only needs `compose.yaml`,
`deploy/Caddyfile` and `.env` from the checkout. GitHub creates the package as private on the
first push: make it public in the package settings, or run `docker login ghcr.io` on the server
with a token that has `read:packages`.

- **Update:** `docker compose pull && docker compose up -d`. The app migrates its database when it starts.
- **Roll back:** set `RACLOTTO_IMAGE=ghcr.io/mtunix/raclotto:<commit sha>` in `.env`, then `docker compose up -d`.
- **Build on the server instead:** `docker compose up -d --build`.
- **Logs:** `docker compose logs -f app`; the app log is also in the volume (`raclotto-api.log`).

All data (the database, generated images included, and the app log) lives in the `data` volume at
`/app/instance`.

- **Back up:** `docker compose exec -T app python -m back.src.backup - > raclotto-$(date +%F).db`
  takes a consistent copy while the app runs. Run it from cron and keep the copies off the server.
- **Restore, or bring an existing database:** with the app stopped (`docker compose stop app`),
  `docker compose run --rm -T app sh -c 'cat > /app/instance/raclotto.db' < raclotto.db`, then
  `docker compose up -d`.

Already running a reverse proxy? Leave Caddy out: publish the app on the loopback interface in a
`compose.override.yaml`, start only the app with `docker compose up -d app`, and proxy to
`127.0.0.1:8081`. `RACLOTTO_DOMAIN` still has to be set.

```yaml
services:
  app:
    ports:
      - "127.0.0.1:8081:8081"
```
