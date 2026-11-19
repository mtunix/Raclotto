# Raclotto

[![CI](https://github.com/mtunix/Raclotto/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/mtunix/Raclotto/actions/workflows/ci.yml)

Made for snack lovers by snack lovers <3

Raclotto is a raclette lottery. Everyone at the table joins a session and rolls pans of random
ingredients from the session's catalog, filtered by their diet, then rates what they got. Rolling
earns XP and levels, rolling and rating earn achievements, and session events such as a pan swap
keep the table moving. When the session's creator ends it, everyone gets a recap of the evening;
the rules are in the app under Rules. Accounts are created by invitation; ingredient catalogs can
be exported and imported, and profile pictures can be generated with Google's image model.

A Flask and SQLite backend serves a React and TypeScript frontend; both ship as one Docker image.

## Developing

You need Python 3.14 and Node 24.

```bash
python -m venv venv && venv/bin/pip install -r requirements-dev.txt
(cd front && npm ci)
venv/bin/python -m back.src.dev     # API on 127.0.0.1:8081, reloads on change
cd front && npm start               # frontend dev server, proxies the API to it
```

`.env.example` lists every variable; copy it to `.env` to set any. Set `RACLOTTO_ADMIN_PASSWORD`
there to get an `admin` user on the first start, who can then invite others. A session can be
renamed, closed, reopened or deleted only by its creator or an admin, and only admins change the
global settings. An admin grants or revokes admin for other users under Settings → Admins; nobody
changes their own, so there is always an admin left.

The checks CI runs:

```bash
venv/bin/python -m unittest discover -s back/test -t .      # backend tests
venv/bin/mypy                                               # backend types
venv/bin/ruff check && venv/bin/ruff format --check         # backend lint and formatting
cd front && npx tsc -b && npm run lint && npx vitest run   # frontend types, lint and tests
cd front && npm run gen:api:check                           # the API client matches the backend
cd front && npm run test:e2e                                # end to end (npx playwright install chromium first)
```

The frontend's API client is generated from the backend: after changing a DTO, run
`cd front && npm run gen:api` to rewrite `back/openapi.json` and `front/src/api/generated/`.
To keep formatting-only commits out of `git blame`, run
`git config blame.ignoreRevsFile .git-blame-ignore-revs` once.

| Path | What's there |
|---|---|
| `back/src/` | Flask API: routes in `api/`, domain logic in `interactor/`, models in `entity/` |
| `back/migrations/` | Alembic revisions, applied when the app starts |
| `back/test/` | Unit and integration tests |
| `front/src/` | React app: views in `features/` and `shared/`, the generated client in `api/generated/` |
| `deploy/` | Caddy config, systemd unit, release and update scripts |

## Deploying with Docker

What you need: a server with Docker and Docker Compose, and a domain pointing at it.
[Caddy](https://caddyserver.com) answers on ports 80 and 443 and gets the HTTPS certificate on its own.

```bash
git clone https://github.com/mtunix/Raclotto raclotto && cd raclotto
cp .env.example .env    # set RACLOTTO_DOMAIN and RACLOTTO_JWT_SECRET, and RACLOTTO_ADMIN_PASSWORD for the first start
docker compose up -d
```

CI publishes the image of every [release](#releasing) as `ghcr.io/mtunix/raclotto:<version>`
and `:latest`. The server only needs `compose.yaml`, `deploy/Caddyfile` and `.env` from the
checkout. GitHub creates the package as private on the first release: make it public in the
package settings, or run `docker login ghcr.io` on the server with a token that has `read:packages`.

- **Update:** `docker compose pull && docker compose up -d`. The app migrates its database when it starts.
- **Pin or roll back:** set `RACLOTTO_IMAGE=ghcr.io/mtunix/raclotto:2026.01` in `.env`, then
  `docker compose up -d`. A database migrated by a newer release may not work with an older one;
  restore the backup taken before the update.
- **Which version runs:** `curl https://<domain>/api/health`.
- **Build on the server instead:** `docker compose up -d --build` (reports version `dev`).
- **Logs:** `docker compose logs -f app`; the app log is also in the volume (`raclotto-api.log`).

All data (the database, generated images included, and the app log) lives in the `data` volume at
`/app/instance`. The database is `raclotto.db` together with its `raclotto.db-wal` file, which can
hold the latest changes: copy it only with the backup command below, never the file alone.

- **Back up:** `docker compose exec -T app python -m back.src.backup - > raclotto-$(date +%F).db`
  takes a consistent copy while the app runs. Run it from cron and keep the copies off the server.
- **Restore, or bring an existing database:** with the app stopped (`docker compose stop app`),
  `docker compose run --rm -T app sh -c 'cd /app/instance && rm -f raclotto.db-wal raclotto.db-shm && cat > raclotto.db' < raclotto.db`,
  then `docker compose up -d`. A `-wal` file left from the old database would be applied to the restored one.

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

`deploy/update.sh` is also the update: it checks out the latest release (or the one given,
`deploy/update.sh 2026.01`), installs the requirements, builds the frontend into `static/`
(`npm run build:static`) and restarts the service, which migrates the database. The app listens
on `127.0.0.1:8081`. With Caddy as the proxy, the site block is:

```
raclotto.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8081
}
```

- **Logs:** `journalctl -u raclotto -f`, and `instance/raclotto-api.log`.
- **Back up:** `sudo -u raclotto venv/bin/python -m back.src.backup - > ~/raclotto-$(date +%F).db`.
- **Restore:** `sudo systemctl stop raclotto && sudo rm -f instance/raclotto.db-wal instance/raclotto.db-shm && sudo install -o raclotto -g raclotto -m 600 raclotto-<date>.db instance/raclotto.db && sudo systemctl start raclotto`.
  Copy the database only with the backup command: recent changes can be in `instance/raclotto.db-wal`.

## Releasing

Development happens on `dev`; `master` holds only releases. A version is
`<year>.<release>[<patch>]`: `2026.01`, `2026.02`, … with the release number starting at 01 each
year, and a fix to the latest release gets a letter, `2026.02a`, `2026.02b`, …

```bash
deploy/release.sh                        # dev, once CI is green on it, as the next release
git push --atomic origin master dev 2026.03
```

For a fix to the latest release without what is new on `dev`, branch from `master`, commit the
fix there, and release it as a patch; the script merges the branch into `dev` as well:

```bash
git switch -c fix-rating master          # … commit the fix
deploy/release.sh --patch fix-rating
git push --atomic origin master dev 2026.03a
```

`deploy/release.sh --patch` without a branch releases `dev` as a patch. The script merges into
`master`, tags the version and prints the push; it pushes nothing itself. Pushing the tag makes
CI test it, publish the image and create the GitHub release.
