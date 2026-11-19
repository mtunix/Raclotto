# The database migrates itself at startup

- Status: accepted
- Date: 2026-11-18 (`5a42153` Add Alembic migrations)

## Context

The schema came from `create_all`, which creates missing tables but never adds a column to an
existing one. Databases created before the English and German level labels existed lacked those
columns, and running instances are SQLite files that only the app itself opens: in the `data`
volume under Docker, or `instance/` in a checkout under systemd.

## Decision

Schema changes ship as Alembic revisions in `back/migrations/`, and the app applies them itself.
At startup `migrate()` in `back/src/driver/migrations.py`:

- creates an empty database from the models and stamps it at head;
- upgrades an existing database to head, then runs `create_all` for tables that predate the
  migrations;
- refuses to start (`SchemaDriftError`) when a model column is still missing afterwards.

Revisions do not import app code; data a revision needs is frozen into it (the first revision
carries its own copy of the level labels).

## Consequences

- Deploying a new version is enough to migrate; neither route (Docker, systemd) has a separate
  migration step.
- A model column added without a revision stops the app at startup instead of failing on the
  first query that touches it.
- Revisions stay runnable after the models move on, at the cost of duplicating the data they use.
- Startup only ever upgrades; it never downgrades a database to an older version's head.
- `alembic` on the command line reads `RACLOTTO_DATABASE_URL` but not `.env`.
