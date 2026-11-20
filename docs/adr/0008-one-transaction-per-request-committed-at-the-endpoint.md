# One transaction per request, committed at the endpoint

- Status: accepted; supersedes the transaction part of [0002](0002-achievements-and-events-react-to-facts.md)
- Date: 2026-11-20 (`2e946c5` Commit each request's transaction at the endpoint boundary)

## Context

Routes and modules committed for themselves: a route called `db.session.commit()` after its
change, and `PanRoll.roll_into(..., present)` built the response inside the roll so that a failure
there still rolled the roll back. Each new route had to remember where to commit, and to build its
response DTO first, because the commit expires the loaded objects. A route that raised after a
callee had committed left that part behind, and a GET ended with its transaction still open, which
under ADR 0007's `BEGIN IMMEDIATE` holds the database's one write lock until the session is torn
down.

## Decision

The endpoint machinery owns the request's transaction (`one_transaction` in `api/base_api.py`,
wrapped around every typed endpoint by `BaseApi.dispatch_request`):

- A request that isn't a GET is committed once the handler has returned and its response DTO is
  rendered to JSON, so the response reads the objects before the commit expires them.
- Any exception, from the handler, from rendering or from the commit itself, rolls the transaction
  back. An `IntegrityError` then becomes a 409, an `ApiError` its own error, anything else a 500.
- A GET always ends with a rollback, so a read never writes, and gives up the lock once its
  response is rendered.

Handlers, modules (`interactor/`) and repositories flush but never commit; `Achievements.record`,
`Events.record` and `PanRoll.roll` run inside the request's transaction, and `roll_into` is gone.

The one exception is `commit_before_slow_work()` (`driver/database.py`): a module about to call
out to something slow commits the request's transaction early, so the write lock (ADR 0007) is not
held while it waits. Profile-picture generation calls it before the image model; whatever is
written after it is committed by the endpoint as usual.

## Consequences

- A route is the handler and its DTO; there is no commit to place and no response to build early.
  A failed request leaves nothing behind, a roll's XP, events and achievements included.
- A GET handler that writes loses the write without an error. Writes go in POST, PATCH, PUT or
  DELETE endpoints.
- After `commit_before_slow_work()`, a failure rolls back only what came after it; the work
  committed before stays. Any new call to it needs that to be acceptable.
- Code that runs outside an endpoint, such as the seeding at startup, still commits for itself.
- `test_request_transaction.py` checks the three cases against a probe API.
