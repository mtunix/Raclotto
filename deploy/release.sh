#!/usr/bin/env bash
# Releases to master and tags the version; pushes nothing.
#   deploy/release.sh                   dev as the next release: 2026.01, 2026.02, …
#   deploy/release.sh --patch [BRANCH]  BRANCH (default dev) as a patch to the latest release: 2026.02a, …
# A patch branch starts from master; it is merged into dev as well.
set -euo pipefail

fail() {
  echo "$1" >&2
  exit 1
}

main() {
  cd "$(dirname "$0")/.."
  local patch="" source=dev
  case "${1:-}" in
    "") [ $# -eq 0 ] || fail "usage: deploy/release.sh [--patch [BRANCH]]" ;;
    --patch) patch=--patch source="${2:-dev}"; [ $# -le 2 ] || fail "usage: deploy/release.sh [--patch [BRANCH]]" ;;
    *) fail "usage: deploy/release.sh [--patch [BRANCH]]" ;;
  esac
  [ -z "$(git status --porcelain)" ] || fail "The working tree has changes; commit or stash them first."
  git fetch --quiet --tags origin
  git merge-base --is-ancestor origin/master "$source" \
    || fail "$source doesn't contain origin/master; merge master into it first."
  if git rev-parse --verify --quiet origin/dev >/dev/null; then
    git merge-base --is-ancestor origin/dev dev || fail "dev is behind origin/dev; pull it first."
  fi

  local python=python3 version
  [ -x venv/bin/python ] && python=venv/bin/python
  version="$(git tag --list | "$python" -m back.src.version next ${patch:+"$patch"})"

  git switch --quiet master
  git merge --quiet --ff-only "$source"
  if [ "$source" != dev ]; then
    git switch --quiet dev
    git merge --quiet --no-edit "$source"
  fi
  git tag --annotate "$version" --message "Raclotto $version" master
  git switch --quiet dev
  echo "Tagged $version on master. Publish it with:"
  echo "  git push --atomic origin master dev $version"
}

main "$@"
