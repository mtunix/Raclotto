# Raclotto

Raclette lottery: users join a session, roll pans of random ingredients, rate them, and earn
XP, levels and achievements. Two apps in one repo:

| Path     | Stack                                                        |
|----------|--------------------------------------------------------------|
| `back/`  | Python 3.14 (`.python-version`), Flask 3.1, SQLAlchemy 2, SQLite |
| `front/` | React 19, TypeScript, Zustand + SWR, antd, ejected CRA (webpack + jest) |

There are no dev docs. The code map below and the module docstrings are the reference; read
the module you are changing before inferring patterns from its neighbours.

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

Schema changes ship with an Alembic revision (`venv/bin/alembic revision -m "..."`; render it with
`--autogenerate` against a database at head via `RACLOTTO_DATABASE_URL`). At startup `migrate()`
creates and stamps a new database, upgrades an existing one, and refuses to start if a model
column is still missing. Revisions don't import app code: freeze any data they need.

Every endpoint is typed: `BaseApi.endpoint(route, methods, query=, body=, response=, status=, errors=, operation_id=)`.

- Declares `response=XDto` / `list[XDto]`, or `status=204`; anything else fails at class definition.
- The handler gets `query=` / `body=` as validated DTOs (path params as plain kwargs) and returns the
  response DTO; returning anything else is a 500.
- `errors=` lists every error status the handler and its callees raise; 400 (invalid DTO) and 401
  (`@require_auth`) are implied.
- `operation_id` names the generated client function (`rollPan`); unique across the app.
- Responses are plain JSON (`application/json` only, 406/415 otherwise). Errors are
  `{"errors": [ApiErrorDto, …]}` (`ErrorResponseDto`); raise `ApiError` to produce one.

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
  what happened (`PanRolled`, `PanRated`, `IngredientAdded`, `CatalogChanged`,
  `SessionClosed`); evaluators declare `reacts_to`, `audience` and `revocable`. Never special-case
  an achievement by title outside its evaluator. `record` flushes, the caller commits.

### Frontend (`front/src/`)

| Path | Role |
|---|---|
| `api/generated/` | orval output from `back/openapi.json`: endpoint functions, SWR hooks, key getters, DTO types. Never edit; `npm run gen:api`. |
| `lib/api/transport.ts`, `orvalMutator.ts` | The seam: generated code calls the mutator, which calls `transport()`. Auth hooks are registered by `AuthSlice`. |
| `lib/api/swrHooks.ts` | Cache invalidation (`mutateX`) built on the generated key getters; SWR retry policy. |
| `model/diet.ts`, `features/generation/applyRollOutcome.ts`, `features/ingredients/ingredientCatalog.ts`, `features/history/usePanPages.ts`, `features/settings/ingredientImport.ts`, `shared/EventDisplay/sessionEvents.ts`, `shared/profilePictureHistory.ts` | Hand-written domain logic over the generated types. |
| `features/`, `shared/` | Feature views and shared components. `shared/` never imports `features/`. |
| `AuthSlice.ts`, `AppSlice.ts` | Zustand stores (signed-in user, current session). |

A roll returns a `RollOutcomeDto` (pan + reward + achievements + events); apply it with
`features/generation/applyRollOutcome.ts`, never by refetching the user and diffing XP.

## Commits

**Subject only, by default.** One line, imperative, no ticket prefix. Most commits need no body.

**A body, when the subject can't carry it, is a comma-separated list of short labels** — the
areas touched, a few words each. Not sentences, no rationale, no before/after narrative:

```
Deepen pan roll and achievements

Pan roll module, Achievement facts, Read-only achievement list, App test harness
```

**Never add a `Co-Authored-By:` trailer** or any other authorship/tool attribution.

`master` is the main branch; work on a feature branch.

## Commands

Run from the repo root unless noted. The venv is `venv/`; it has drifted from
`requirements.txt` before — rebuild it (`pip install -r requirements.txt`) if imports fail.

```bash
venv/bin/python -m unittest discover -s back/test -t .     # whole backend suite
venv/bin/python -m unittest back.test.integration.test_pan_roll   # one module
venv/bin/python -m back.src.main                           # run the server (port 8081); migrates instance/raclotto.db
venv/bin/alembic current                                   # revision of instance/raclotto.db (RACLOTTO_DATABASE_URL overrides)

cd front && CI=true npx jest <path>      # one test file — the edit loop
cd front && CI=true npx jest             # whole frontend suite
cd front && npx tsc --noEmit             # type check
cd front && npm start                    # dev server
cd front && npm run gen:api              # back/openapi.json + api/generated/ from the DTOs
cd front && npm run gen:api:check        # regenerate and fail on drift
venv/bin/python -m back.test.export_wire_fixtures   # rewrite lib/api/__fixtures__/backendResponses.ts
cd front && BUILD_PATH=/tmp/raclotto-build npm run build   # front/build/ is tracked; build elsewhere
```

`npm run lint` runs, but its unquoted globs only reach `src/*/`; `npx eslint 'src/**/*.{ts,tsx}'`
covers everything (4 `import/first` errors in `GenerateView.tsx`, many warnings).

Known-broken frontend suites: `App.test.js`, `ErrorPage`, `GenerateView`, `HistoryView`,
`SettingsView`, `MainScreen`, `StartScreen`, `Toolbar` fail to load (react-router needs
`TextEncoder`, the CSS transform predates Jest 28, stale `../AppSlice` mock paths); `DialView`
loads but 3 assertions are stale. The view suites need `FakeTransport` to be revived.

## Verify what you changed, not the whole repo

| Changed only | Loop with |
|---|---|
| `back/` | the touched test module, then the whole backend suite |
| `front/src/` | `npx jest <path>`, then `npx tsc --noEmit`, then the whole frontend suite |
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
- **Frontend:** jest. Call the generated functions against `FakeTransport` (`setTransport(fake)`,
  `fake.on(...)`, `fake.last(...)`) with fixtures from `lib/api/__fixtures__/backendResponses.ts`,
  not by mocking axios or modules.
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
- **Domain behaviour goes in `interactor/`,** not in route handlers. A route that grows
  business logic is a module waiting to be extracted.
- **Ingredient categories** (meat/vegetarian/vegan/fish) are mutually exclusive on an
  ingredient; on a user they are a hierarchy. `Diet` is the only translation between the two.
- **Responses** are the DTO as plain JSON, snake_case fields, int ids, ISO datetimes. Lists are
  `list[XDto]`; pages are `*PageDto` (`items, total, limit, offset, has_more`). Roll endpoints
  return `RollOutcomeDto` (`pan`, `reward`, `achievements`, `events`).
