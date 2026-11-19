# Raclotto

Raclette lottery: users join a session, roll pans of random ingredients, rate them, and earn
XP, levels and achievements. Two apps in one repo:

| Path     | Stack                                                        |
|----------|--------------------------------------------------------------|
| `back/`  | Python 3.14 (`.python-version`), Flask 3.1, SQLAlchemy 2, SQLite |
| `front/` | React 19, TypeScript 6, Zustand + SWR, antd, Vite 8 (`vite.config.ts`, also configures Vitest 5), React Compiler via Babel 7 (Babel 8 silently skips components) |

The code map below and the module docstrings are the reference, with the domain's terms in
`GLOSSARY.md` and past decisions in `docs/adr/`; read the module you are changing before inferring
patterns from its neighbours.

## Where things live

### Backend (`back/src/`)

| Layer | Path | Role |
|---|---|---|
| Routes | `api/*_api.py`, `driver/auth_api.py` | Take DTOs, call a module, return a DTO. Keep thin. |
| DTOs | `dto/` | Pydantic request/response shapes; one canonical DTO per resource (`PanDto`, `LevelDto`, …). |
| Domain modules | `interactor/` | Behaviour behind small interfaces (below). |
| Repositories | `repository/` | Queries over the global `db.session`. Thin on purpose. |
| Entities | `entity/` | SQLAlchemy models. |
| App wiring | `driver/app.py`, `driver/api_custom.py`, `api/base_api.py` | Flask app, seeding, route registry, error handlers. |
| Spec | `api/openapi.py` | Builds `back/openapi.json` from the endpoint declarations. |
| Migrations | `driver/migrations.py`, `back/migrations/` | Alembic; the app migrates its database at startup (below). |
| Frontend serving | `driver/app.py` (`App.serve`) | Files of the frontend build in `static/`; any other non-API path gets `index.html` for the browser router. |
| Auth | `auth/` | JWT (carries the user's `token_version`), the `@require_auth` guard, the in-memory login throttle (5 failures per address and account per 15 min). |

Schema changes ship with an Alembic revision (`venv/bin/alembic revision -m "..."`; render it with
`--autogenerate` against a database at head via `RACLOTTO_DATABASE_URL`). At startup `migrate()`
creates and stamps a new database, upgrades an existing one, and refuses to start if a model
column is still missing. Revisions don't import app code: freeze any data they need. A table or
column the models drop stays in the database, listed in `RETIRED_*` (`driver/migrations.py`) so
autogenerate leaves it alone; a revision gives a NOT NULL one a server default.

Every endpoint is typed: `BaseApi.endpoint(route, methods, query=, body=, response=, status=, errors=, operation_id=)`.

- Declares `response=XDto` / `list[XDto]`, or `status=204`; anything else fails at class definition.
- The handler gets `query=` / `body=` as validated DTOs (path params as plain kwargs) and returns the
  response DTO; returning anything else is a 500.
- `errors=` lists every error status the handler and its callees raise; 400 (invalid DTO) and 401
  (`@require_auth`) are implied. A permission check runs inside `with guarded():` (`api/guard.py`),
  which turns `Forbidden` into a 403.
- `operation_id` names the generated client function (`rollPan`); unique across the app.
- Responses are plain JSON (`application/json` only, 406/415 otherwise). Errors are
  `{"errors": [ApiErrorDto, …]}` (`ErrorResponseDto`); raise `ApiError` to produce one. Its `code`
  (`ApiErrorCode` in `dto/base.py`) is what the frontend translates; `title` and `detail` are English
  for logs and API users, never shown in the UI.

The deep modules in `interactor/` and what they own:

- **`diet.py` — `Diet`**: the one rule for which ingredients a user's diet allows
  (`allows` in Python, `ingredient_filter` in SQL) and how a diet is normalized
  (meat ⇒ vegetarian ⇒ vegan; fish independent). Never re-implement this check.
- **`pan_roll.py` — `PanRoll.roll(user, session_key, RollOptions) -> RollOutcome`**: the whole
  roll — eligible ingredients, fill/sauce split, naming, prep type/cheese, session membership,
  XP/level, events, achievements — in one transaction. Classic, bandit and hand-picked pans
  all go through it; routes call `roll_into(..., present)` so the response DTO is built
  before the commit.
- **`achievements.py` — `Achievements.record(fact) -> AchievementChanges`**: routes report
  what happened (the facts in `facts.py`: `PanRolled`, `PanRated`, `IngredientAdded`,
  `CatalogChanged`, `SessionClosed`); evaluators declare `reacts_to`, `audience` and `revocable`,
  and are registered by the achievement's `key` (`AchievementKey`), which also names its texts in the
  frontend. Never special-case an achievement by key or title outside its evaluator. `record` flushes, the caller
  commits, together with the change the fact reports.
- **`events.py` — `Events.record(fact) -> list[Event]`**: session events (pan swap) from the same
  facts; evaluators declare `event_type`, `reacts_to` and a default `cooldown`. Owns the
  enabled/frequency config (a session's own overrides the global one). A new event type also goes
  into `EventType` in `dto/event.py`, and its name and message, filled from the event's `data`, into
  the frontend's `events.types.<type>`.
- **`accounts.py` — `Accounts`**: invites (issue, look up, revoke), creating users, by
  registration or the admin seed (`is_admin`), granting or revoking admin, and changing a password,
  which bumps the user's `token_version` and so revokes every token issued before; a new user
  starts at the lowest level.
- **`permissions.py` — `Permissions(user)`**: who may change what. A session is its creator's to
  rename, close, reactivate, delete and configure events for; a pan its author's; the global event
  configs and default preparation types an admin's. Admins may do all of it, and grant or
  revoke admin for anyone but themselves, so the last admin can't be lost. Rolling,
  rating and a session's ingredients are open to everyone signed in. Never check ownership in a route.
- **`session_recap.py` — `SessionRecaps().of(session)`**: the recap a session closes with (best,
  worst and boldest pan, favorite ingredient, each participant's pans, XP and stars); read-only.
- **`levels.py` — `Levels`**: the XP a pan earns and the level it reaches (`award -> Reward`),
  the progress a profile shows, and the level new users start at.
- **`pan_history.py` — `PanHistory`**: the pans of a session or user, sorted, filtered and paged in
  SQL as a whole (never in the browser), and the filter options a session's pans offer.
- **`pan_ratings.py` — `PanRatings`**: rate a pan, change or withdraw your own rating (anyone
  else's is reported as missing); every change of stars reports `PanRated`.
- **`ingredient_catalog.py`, `profile_pictures.py`, `user_stats.py`**: ingredient changes and
  imports (with their achievement facts), pictures added or generated (behind the `ImageGenerator`
  seam) and the candidate generation starts from, profile statistics. Routes map their errors to
  `ApiError`.

### Frontend (`front/src/`)

| Path | Role |
|---|---|
| `api/generated/` | orval output from `back/openapi.json`: endpoint functions, SWR hooks, key getters, DTO types. Never edit; `npm run gen:api`. |
| `lib/api/transport.ts`, `orvalMutator.ts` | The seam: generated code calls the mutator, which calls `transport()`. Auth hooks are registered by `AuthSlice`. |
| `lib/api/swrHooks.ts` | Cache invalidation (`mutateX`) built on the generated key getters; SWR retry policy. |
| `model/diet.ts`, `model/levelProgress.ts`, `model/permissions.ts`, `features/generation/rollSession.ts`, `features/generation/applyRollOutcome.ts`, `features/rating/ratePan.ts`, `features/ingredients/ingredientCatalog.ts`, `features/history/usePanPages.ts`, `features/settings/ingredientImport.ts`, `shared/EventDisplay/sessionEvents.ts`, `shared/XpNotification/xpNotificationTimeline.ts`, `shared/myProfilePicture.ts`, `shared/imageGeneration.ts` | Hand-written domain logic over the generated types. |
| `features/`, `shared/` | Feature views and shared components. `shared/` never imports `features/`. |
| `AuthSlice.ts`, `AppSlice.ts` | Zustand stores (signed-in user, current session). |
| `i18n.ts` | Translations; the language last shown is kept in `localStorage`, and `followUserLanguage()` (started in `index.tsx`) switches to the signed-in user's. |
| `lib/language.ts`, `locales/` | Every user-visible text is a key in both `locales/{de,en}` (no `|| "fallback"`; `locales/translations.test.ts` checks), dates go through `formatDate`/`formatDateTime` and numbers through `formatNumber`/`formatRating` (antd `Statistic`: `numberFormatter`), and antd's own texts follow the language via `AntdLocale`. The backend sends identifiers, not text: achievements by `key` (`shared/achievementText.ts`), events by `event_type` and `data` (`eventMessage`), errors by `code` (`failureMessage` in `lib/api/failedRequest.ts`); the test checks every identifier the generated client lists. |

A roll returns a `RollOutcomeDto` (pan + reward + achievements + events). Views roll through
`useRollSession` (`features/generation/rollSession.ts`: roll, reveal, rate, level-up picture), which
applies it with `applyRollOutcome`, never by refetching the user and diffing XP.

## Commits

**Subject only, by default.** One line, imperative, no ticket prefix. Most commits need no body.

**A body, when the subject can't carry it, is a comma-separated list of short labels** — the
areas touched, a few words each. Not sentences, no rationale, no before/after narrative:

```
Deepen pan roll and achievements

Pan roll module, Achievement facts, Read-only achievement list, App test harness
```

**Never add a `Co-Authored-By:` trailer** or any other authorship/tool attribution.

`dev` is where development happens: commit there, or on a feature branch off it that merges
back into `dev`. `master` gets only releases, through `deploy/release.sh`; never commit to it
directly. A release is a tag `<year>.<release>[<patch>]` (`2026.01`, `2026.02`, a fix `2026.02a`;
the release number restarts at 01 each year), made by the script, never by hand.

## Commands

Run from the repo root unless noted. The venv is `venv/`; it has drifted from
`requirements.txt` before — rebuild it (`pip install -r requirements-dev.txt`: the runtime
requirements plus ruff, mypy and stubs) if imports fail. Dev-only tools go in `requirements-dev.txt`.

```bash
venv/bin/python -m unittest discover -s back/test -t .     # whole backend suite
venv/bin/python -m unittest back.test.integration.test_pan_roll   # one module
venv/bin/mypy                                              # type check: back/src strict, back/test bodies (pyproject.toml)
venv/bin/ruff check --fix && venv/bin/ruff format           # lint (autofix what it can) and format the backend
venv/bin/python -m back.src.dev                            # dev server for `npm start`: Flask debug + reload, 127.0.0.1:8081
venv/bin/python -m back.src.main                           # production server (waitress); needs RACLOTTO_JWT_SECRET
venv/bin/alembic current                                   # revision of instance/raclotto.db (RACLOTTO_DATABASE_URL overrides)
venv/bin/python -m back.src.backup DEST                    # consistent copy of the database while it runs; `-` for stdout
deploy/release.sh                                          # dev → master, tagged as the next release; --patch [BRANCH] for a letter

cd front && npx vitest run <path>        # one test file — the edit loop
cd front && npx vitest run               # whole frontend suite
cd front && npx tsc -b                  # type check: src (tsconfig.app.json), tool configs (tsconfig.node.json)
cd front && npm run test:e2e             # Playwright against the production server and build (E2E_CHANNEL=chrome: installed Chrome)
cd front && npm start                    # Vite dev server: https://localhost:3001, proxies /api to 8081
cd front && npm run gen:api              # back/openapi.json + api/generated/ from the DTOs
cd front && npm run gen:api:check        # regenerate and fail on drift
venv/bin/python -m back.test.export_wire_fixtures   # rewrite lib/api/__fixtures__/backendResponses.ts
cd front && npm run build                # production bundle in front/build/ (ignored by git)
cd front && npm run build:static         # the same into ../static/, where the backend serves it (ignored by git)
```

`npm run lint` (ESLint 10, flat config in `eslint.config.mjs`: the recommended type-checked sets of
`typescript-eslint` and `@eslint-react`, plus `jsx-a11y`) covers `front/` except the generated client,
with `--max-warnings 0`; CI runs it, so a warning fails the build. A deliberate exception gets a
one-line `eslint-disable-next-line <rule> -- <why>`, never a file- or rule-wide disable. TypeScript
stays on 6: TS 7's native compiler has no JS API yet, which `@typescript-eslint` needs.

`ruff` (config in `pyproject.toml`) lints and formats all Python; CI runs `ruff check` and
`ruff format --check`. A deliberate exception gets `# noqa: <code>  # <why>` on its line. Commits
that only reformat go into `.git-blame-ignore-revs`.

## Configuration

Read from the environment (and a git-ignored `.env`; `.env.example` documents every variable) by
`production_config` / `development_config` in `driver/config.py`, nowhere else. Both servers
migrate `instance/raclotto.db` under the working directory unless `RACLOTTO_DATABASE_URL` says
otherwise; run them from the repo root.

| Variable | Default | |
|---|---|---|
| `RACLOTTO_JWT_SECRET` | — | Required in production: ≥ 32 bytes, not a value that was in source. Dev ignores it. |
| `RACLOTTO_DATABASE_URL` | `sqlite:///raclotto.db` | `alembic` reads it too, but not from `.env`; give SQLite an absolute path so both open the same file. |
| `RACLOTTO_ADMIN_PASSWORD` | — | Creates user `admin` only when none exists; never changes an existing one. |
| `RACLOTTO_HOST`, `RACLOTTO_PORT` | `127.0.0.1`, `8081` | Production listen address. The dev server always binds 127.0.0.1. |
| `RACLOTTO_LOG_FILE` | `raclotto-api.log` | App log; a relative path is under the instance folder (`instance/raclotto-api.log`). Test and in-memory configs write no log file. |
| `RACLOTTO_TRUSTED_PROXY` | — | The reverse proxy whose `X-Forwarded-For/-Proto/-Host` waitress believes (`127.0.0.1`, or `*` in compose). |
| `GOOGLE_GENAI_API_KEY` | — | Image generation; unavailable without it. |

`RACLOTTO_DOMAIN` and `RACLOTTO_IMAGE` are read only by `compose.yaml`.

## Deployment

The README has the operator steps. The pieces:

- **Docker (the main route):** `Dockerfile` builds the frontend in a Node stage and copies the
  build into `static/` of a Python image that runs `back.src.main`, healthchecked on
  `GET /api/health`. `compose.yaml` runs it with the `data` volume at `/app/instance` behind Caddy
  (`deploy/Caddyfile`). `.dockerignore` is an allowlist: a new top-level path the app needs at
  runtime has to be added there.
- **Without Docker (the alternative):** systemd runs `back.src.main` from a checkout
  (`deploy/raclotto.service`); `deploy/update.sh` pulls, installs, builds the frontend into
  `static/` (`npm run build:static`) and restarts. Keep both routes working when deployment changes.
- `static/` is build output, ignored by git. Never commit a frontend build.
- **Versions** (`back/src/version.py`): the numbering, and the running app's version, read from the
  `VERSION` file the build writes (ignored by git; the Docker build arg, or `git describe` in
  `deploy/update.sh`) and reported by `/api/health`. Without the file it is `dev`.
- Base images are pinned by tag and digest, like the actions; bump both together.

## CI

`.github/workflows/ci.yml` runs on pushes to `dev`, release tags, pull requests and by hand
(`workflow_dispatch`): `ruff`, the backend suite, `venv/bin/mypy`, `tsc`, `npm run lint`, Vitest, the
production build (which type-checks first), `npm run gen:api:check` and the Playwright suite. A push to
`master` alone runs nothing; its release tag does. Python and Node versions come from
`.python-version` and `front/.nvmrc`; actions are pinned to commit SHAs. After those pass, for a
release tag or a manual run only, the `image` job builds the Docker image and smoke-tests it
(healthy, serves the index, `/api/health` reports the version). For a release tag it checks the tag
is a version on `master`, pushes `ghcr.io/mtunix/raclotto:<version>` and `:latest`, and creates the
GitHub release; a manual run (`gh workflow run ci.yml --ref dev`) only builds and tests a `dev`
image, the check to run after changing the `Dockerfile`, `.dockerignore` or `requirements.txt`.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs against `dev` for actions, base
images (patch and digest only), pip and npm; Node, Python and TypeScript major lines move by hand.

## Verify what you changed, not the whole repo

| Changed only | Loop with |
|---|---|
| `back/` | the touched test module, then the whole backend suite, then `venv/bin/mypy` and `ruff` |
| `front/src/` | `npx vitest run <path>`, then `npx tsc -b`, then the whole frontend suite |
| both sides | the two rows above; also check the wire contract (below) |

- **Narrowest first.** A single test module before its suite.
- **The sides are independent.** A `back/`-only change can't break the frontend's tests,
  except through the wire format.
- **Wire contract.** Change the DTO → `npm run gen:api` → fix the call sites `tsc` points at →
  rerun `export_wire_fixtures`. The generated files and `back/openapi.json` change only through
  regeneration; call sites use the generated types as they are, no casts.

## Testing

- **Backend:** `unittest`. Pure logic gets a plain `TestCase` (`test/unit/`). Anything
  touching the DB or routes subclasses `AppTest` from `back/test/support.py` (`test/integration/`):
  real app, in-memory SQLite, fresh schema and default data per test, builders
  (`make_user`, `make_session`, `make_ingredient`, `make_pan`, `make_invite`),
  `self.call(method, path, user, body=, query=)` for plain-JSON requests, `recorded_writes()` to
  assert what reached the database.
- **Contract tests** (`test/integration/test_openapi.py`): the committed spec matches the code
  (drift), and every routed endpoint appears in the spec.
- **Frontend:** Vitest (jest-style globals, `vi.*`). Call the generated functions against `FakeTransport` (`setTransport(fake)`,
  `fake.on(...)`, `fake.last(...)`) with fixtures from `lib/api/__fixtures__/backendResponses.ts`,
  not by mocking axios or modules. Views render in a data router through `renderRoutes` /
  `renderRoute` (`src/testUtils.tsx`) and set the Zustand stores with `setState`.
- **End-to-end:** Playwright in `front/e2e/`, against `back.src.main` serving the production build on
  port 8091 with a throwaway database and a generated admin password (`playwright.config.ts`), never a
  dev server. `support.ts`: `t(key)` for UI text (the app runs in German), `createSession`,
  `addIngredients(page, session, PANTRY)` to seed through the API; every test fails on a page error or
  a console error it didn't allow (`test.use({ allowedConsoleErrors })`). Each test makes its own session.
- **Test through the module's interface.** Swap collaborators through constructor arguments
  (`PanRoll(rng=..., achievements=...)`, `Achievements(evaluators=...)`), not `patch`.
- **Regression tests must be seen red before green.** Revert the fix, confirm the new test
  fails for the right reason, restore the fix, confirm it passes.

## Writing comments

Write comments the way a colleague would leave them: one line, to the point, only where the
code can't say it itself. Match the comment density of the file you're in.

**A comment earns its place when it explains *why*.** A non-obvious constraint, a workaround,
an ordering that matters, a deliberate deviation. Never restate *what* the line does.

**Delete on sight:**

- Restatements — `# increment the counter`, `// set loading to true`.
- Section banners — `# ---- helpers ----`, `// State`, `// Handlers`.
- Narration of your own edit — `# changed this to fix the filter bug`, `// new`.
- Multi-line rationale essays. A module docstring may explain the module's concept; anything
  longer belongs in a doc, not a comment.
- Ceremonial docstrings that repeat the signature, `:param:`/`:return:` blocks restating
  annotations.

**Tone:** plain and declarative. No hedging, no "note that", no exclamation marks.

## Conventions

- **Types:** annotate Python signatures; strict TypeScript, no `any` (use `unknown` + guards).
  `venv/bin/mypy` stays clean under `strict`; a needed ignore names its error code and why
  (`# type: ignore[code]  # reason`).
- **Models** subclass `Base` (`driver/database.py`) and declare columns as
  `name: Mapped[T] = mapped_column(...)`: `Mapped[T | None]` makes the column nullable, so the
  annotation is the schema; relationships are `Mapped[list[X]]` / `Mapped[X | None]`.
- **Nothing slow inside a transaction.** File-backed SQLite runs every transaction as `BEGIN IMMEDIATE`
  (ADR 0007), so a request holds the database's one write lock from its first query to its commit:
  commit before calling out (image model, network) or doing slow work.
- **Domain behaviour goes in `interactor/`,** not in route handlers. A route that grows
  business logic is a module waiting to be extracted.
- **Ingredient categories** (meat/vegetarian/vegan/fish) are mutually exclusive on an
  ingredient; on a user they are a hierarchy. `Diet` is the only translation between the two.
- **Responses** are the DTO as plain JSON, snake_case fields, int ids, ISO datetimes. Lists are
  `list[XDto]`; pages are `*PageDto` (`items, total, limit, offset, has_more`). Roll endpoints
  return `RollOutcomeDto` (`pan`, `reward`, `achievements`, `events`).

## Agent skills

### Issue tracker

GitHub Issues on `mtunix/Raclotto`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
