# Keep the login throttle in memory

- Status: accepted
- Date: 2026-11-19 (`67e96f8` Restrict changes to owners and admins and harden sign-in)

## Context

Sign-in takes a name or email and a password, so it needs a limit on guessing. The production
server is one waitress process (`back.src.main`) behind a reverse proxy, with SQLite as its only
store.

## Decision

`LoginThrottle` in `back/src/auth/throttle.py` counts failed sign-ins per client address and
account (`remote_addr|name_or_email`, case-folded). After 5 failures within 15 minutes that key
gets 429 until the oldest failure leaves the window; a successful sign-in clears it. The failures
live in a dict in the app's process, behind a lock, swept once more than 10,000 keys are tracked.

## Consequences

- No table, no migration and no external store; the throttle is a few dozen lines with an
  injectable clock for tests.
- It works only while one process serves the app. Several workers or replicas would each count
  on their own and multiply the allowance.
- A restart forgets every failure.
- Behind the proxy the client address is right only when `RACLOTTO_TRUSTED_PROXY` names it;
  otherwise every client shares the proxy's address and one account's lockout applies to all.
- The original reason for choosing memory over the database is not recorded; the module
  docstring states only that it fits the single waitress process.
