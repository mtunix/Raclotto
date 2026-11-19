# Take SQLite's write lock at the start of every transaction

- Status: accepted
- Date: 2026-11-19 (`ad7010b` Configure SQLite for concurrent writes)

## Context

The production server is one waitress process serving requests on several threads from one
SQLite file. At a raclette table everyone rolls at once, and under that load (the Playwright
suite's parallel workers, or eight clients rolling, rating and listing pans back to back) some
requests failed with 500 "database is locked": 10 of about 1,430 requests over six load runs, in
four of them.

The database ran in SQLite's default rollback-journal mode, where an open read blocks a writer's
commit, with the 5-second busy timeout the `sqlite3` driver sets by default. Every failure was a
write that waited out those 5 seconds. The driver's legacy transaction control, its default up to
Python 3.15, begins a transaction only before an INSERT, UPDATE or DELETE, so a request's reads
before its first write ran outside it: two rolls by the same user could both read the old
experience points, and one award was lost. Without the legacy mode, a transaction that begins with
a plain (deferred) `BEGIN` reads first and fails at once, busy timeout or not, when it then writes
after another transaction committed: in WAL mode 76 of 164 requests of the same load failed so.

## Decision

`back/src/driver/database.py` configures every engine on a SQLite file, through a connect and a
begin event, as SQLAlchemy's SQLite documentation describes for taking over the driver's
transaction control:

- `journal_mode = WAL`: readers and the writer don't block each other, the backup included.
- `busy_timeout` of 30 seconds: a transaction waits that long for the lock before failing.
- `synchronous = NORMAL`, the setting SQLite recommends for WAL: a power loss can lose the last
  commits but can't corrupt the file.
- The driver emits no BEGIN of its own (`isolation_level = None`); SQLAlchemy emits
  `BEGIN IMMEDIATE`. Each transaction takes the write lock with its first query, waiting under the
  busy timeout, and holds it until commit or rollback. Transactions run one after another, so a
  read followed by a write never fails and never acts on a stale read.

Foreign keys stay unenforced, as they were: legacy rows may violate them, batch migrations rebuild
tables, and enforcing them is a decision of its own. In-memory databases keep the driver's
defaults; the tests' sessions share one connection there, where a second BEGIN fails.

Rejected:

- WAL and the busy timeout over the legacy mode passed the load test, but keep the lost update and
  depend on a default Python is retiring.
- A deferred BEGIN fails as measured above.
- `BEGIN IMMEDIATE` only for requests that write (by HTTP method) would let reads run in parallel,
  but a GET that writes would fail again, and the requests' Python work is serialised by the GIL
  anyway: one client and eight clients took the same total time for the same requests.

## Consequences

- No request failed on a lock under the load that failed before (1,440 of 1,440 over six runs).
  The median request took 11 ms, but SQLite's busy handler polls rather than queues, so with eight
  clients and no pause between requests the unluckiest waited 4 to 12 seconds.
- Requests that touch the database run their transactions one at a time. A request holds the lock
  from its first query to its commit or its end, so nothing slow may run inside a transaction:
  profile-picture generation commits before it calls the image model, and startup closes its
  session, whose context stays pushed while the server runs. Password hashing at sign-in is the
  slowest work left inside one.
- A transaction stuck for 30 seconds makes the others fail with "database is locked" instead of
  hanging.
- `instance/` holds `raclotto.db-wal` and `raclotto.db-shm` next to the database while the app runs,
  and after it is killed. Recent commits can be in the `-wal` file: the database is copied only with
  `back.src.backup` (SQLite's backup API, which reads the WAL), and both files are removed before a
  copy is restored over it. The folder must be on a local filesystem, as the Docker volume and
  `instance/` under systemd are.
- `alembic` on the command line uses its own engine with the driver's defaults.
- Tests on in-memory databases don't exercise any of this; `test_sqlite_concurrency.py` runs the
  production app on a file.
