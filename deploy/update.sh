#!/usr/bin/env bash
# Brings a deployment without Docker to the latest master: dependencies, the frontend build in
# static/, then a restart, which migrates the database. Run it as the owner of the checkout.
set -euo pipefail

# Everything in a function: bash has read all of it before `git pull` can rewrite this file.
main() {
  cd "$(dirname "$0")/.."
  git pull --ff-only
  [ -x venv/bin/python ] || python3.14 -m venv venv
  venv/bin/pip install --quiet -r requirements.txt
  (cd front && npm ci --no-audit --no-fund && npm run build:static)
  sudo systemctl restart raclotto
}

main "$@"
