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

## Deploying without Docker

What you need: Python 3.14, Node 24, git and systemd on the server, plus a reverse proxy for HTTPS.
The checkout belongs to you, and the service runs as a `raclotto` user that can write only `instance/`.

```bash
sudo useradd --system --user-group --no-create-home --home-dir /nonexistent raclotto
sudo mkdir /opt/raclotto && sudo chown "$USER": /opt/raclotto
git clone https://github.com/mtunix/Raclotto /opt/raclotto && cd /opt/raclotto
cp .env.example .env && sudo chgrp raclotto .env && chmod 640 .env
# in .env: RACLOTTO_JWT_SECRET, RACLOTTO_TRUSTED_PROXY=127.0.0.1, RACLOTTO_ADMIN_PASSWORD for the first start
mkdir instance && sudo chown raclotto: instance
sudo cp deploy/raclotto.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable raclotto
deploy/update.sh
```

`deploy/update.sh` is also the update: it pulls `master`, installs the requirements, builds the
frontend into `static/` (`npm run build:static`) and restarts the service, which migrates the
database. The app listens on `127.0.0.1:8081`. With Caddy as the proxy, the site block is:

```
raclotto.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8081
}
```

- **Logs:** `journalctl -u raclotto -f`, and `instance/raclotto-api.log`.
- **Back up:** `sudo -u raclotto venv/bin/python -m back.src.backup - > ~/raclotto-$(date +%F).db`.
- **Restore:** `sudo systemctl stop raclotto && sudo install -o raclotto -g raclotto -m 600 raclotto-<date>.db instance/raclotto.db && sudo systemctl start raclotto`.
