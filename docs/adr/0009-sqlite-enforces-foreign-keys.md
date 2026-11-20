# SQLite enforces foreign keys

- Status: accepted; supersedes the foreign-key paragraph of
  [0007](0007-take-the-sqlite-write-lock-at-the-start-of-every-transaction.md)
- Date: 2026-11-20 (`1060834` Enforce foreign keys in SQLite)

## Context

SQLite checks foreign keys only on connections that run `PRAGMA foreign_keys = ON`, and the app's
never did; ADR 0007 left it that way for later. Deleting a session through the API removed the
session row and nothing else: its pans, ratings, ingredients, events and memberships stayed,
pointing at an id that no longer existed, while `Pan.session` is typed as never None. Nothing
failed, so nobody noticed. Deleting a preparation type left the pans made with it pointing at
nothing in the same way.

## Decision

- Every SQLite connection the app opens, in memory too, runs `PRAGMA foreign_keys = ON`
  (`enforce_foreign_keys` in `back/src/driver/database.py`). The tests' in-memory databases
  enforce them like production, so a test that builds rows without their parents fails.
- A delete says what becomes of the rows that reference it, on the models: deleting a session
  cascades to everything in it (`RaclottoSession`'s collections), deleting a pan to its ratings
  and ingredient links, deleting an event to its dismissals; an ingredient leaves the pans it was
  in, and a preparation type leaves its pans without one. A write the database still refuses rolls
  the request back and answers 409 (ADR 0008).
- Migrations run with foreign keys off. Alembic's batch operations rebuild a SQLite table by
  copying, dropping and renaming it, which enforcement would refuse or cascade, and the pragma
  can't change inside a transaction. `migrate()` turns them off on its connection before its
  transaction begins and back on afterwards; the `alembic` CLI's plain connection has them off
  anyway. After the revisions, inside the same transaction, `migrations/env.py` runs
  `PRAGMA foreign_key_check` and fails (`ForeignKeyViolationError`) if any row references a
  missing one, so a revision can't leave violations behind and startup refuses a database that
  has them.
- Revision `085bd0fc56df` cleans what the unenforced years left behind. It repeats
  `PRAGMA foreign_key_check` and deletes each row whose reference dangles, so that a session's or
  a pan's dependants go as the cascades would have taken them, until none is left. The nullable
  references whose null means "none" (a session's creator, a pan's preparation type, a user's
  and a picture's level) are set to null instead. It logs a warning with the count per table, and
  fails if a pass resolves nothing. It also gives `preparation_type.session_id` the foreign key
  its column always meant.

Rejected:

- `ON DELETE CASCADE` in the schema: every referencing table would need a rebuild, and the rule
  would live in revisions rather than on the models.
- Explicit deletes in `Sessions.delete`: each new table that references a session would need
  remembering there; a relationship on the model is found by whoever adds the table.

## Consequences

- A delete that would orphan rows fails with a 409 instead of succeeding silently. A new table or
  delete path needs its cascade, or a deliberate refusal with its own `ApiErrorCode`, and a test.
- Deleting a session loads its pans, ingredients, events and members to delete them one by one;
  for a raclette evening's worth of rows that is nothing.
- Legacy rows that only an orphan could produce, such as a pan whose author is gone, can't exist
  any more; the cleanup deleted them, and with them some data that was already unreachable.
- Tests can no longer insert a row without its parent; they build the parent.
- Every startup scans the database for violations once; at its size that takes milliseconds.
