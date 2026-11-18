# Raclotto

Raclette lottery: users join a session, roll pans of random ingredients, rate them, and earn
XP, levels and achievements. Two apps in one repo:

| Path     | Stack                                                        |
|----------|--------------------------------------------------------------|
| `back/`  | Python 3.10, Flask 3.1, SQLAlchemy 2, SQLite                 |
| `front/` | React 19, TypeScript, Zustand + SWR, antd, ejected CRA (webpack + jest) |

There are no dev docs. The code map below and the module docstrings are the reference; read
the module you are changing before inferring patterns from its neighbours.

## Where things live

### Backend (`back/src/`)

| Layer | Path | Role |
|---|---|---|
| Routes | `api/*_api.py`, `driver/auth_api.py` | Parse input, call a module, serialize. Keep thin. |
| Domain modules | `interactor/` | Behaviour behind small interfaces (below). |
| Repositories | `repository/` | Queries over the global `db.session`. Thin on purpose. |
| Entities | `entity/` | SQLAlchemy models. |
| App wiring | `driver/app.py`, `driver/api_custom.py`, `api/base_api.py` | Flask app, seeding, route registry. |

The deep modules in `interactor/` and what they own:

- **`diet.py` — `Diet`**: the one rule for which ingredients a user's diet allows
  (`allows` in Python, `ingredient_filter` in SQL) and how a diet is normalized
  (meat ⇒ vegetarian ⇒ vegan; fish independent). Never re-implement this check.
- **`pan_roll.py` — `PanRoll.roll(user, session_key, RollOptions) -> RollOutcome`**: the whole
  roll — eligible ingredients, fill/sauce split, naming, prep type/cheese, session membership,
  XP/level, events, achievements — in one transaction. Classic, bandit and hand-picked pans
  all go through it.
- **`achievements.py` — `Achievements.record(fact) -> AchievementChanges`**: routes report
  what happened (`PanRolled`, `PanRated`, `IngredientAdded`, `CatalogChanged`,
  `SessionClosed`); evaluators declare `reacts_to`, `audience` and `revocable`. Never special-case
  an achievement by title outside its evaluator. `record` flushes, the caller commits.

### Frontend (`front/src/`)

| Path | Role |
|---|---|
| `lib/api/transport.ts` | The seam: `Transport` interface, axios adapter, `setTransport`. |
| `lib/api/jsonapi.ts`, `mappers.ts` | JSON:API envelope + exactly one mapper per resource. |
| `lib/api/index.ts` | `Api` facade: thin typed requests returning domain models. |
| `lib/api/swrHooks.ts`, `apiSession.ts` | SWR hooks over `Api`; no mapping of their own. |
| `model/` | Domain types (`Pan`, `User`, `RollOutcome`, `diet.ts`, …). |
| `features/`, `shared/` | Feature views and shared components. `shared/` never imports `features/`. |
| `AuthSlice.ts`, `AppSlice.ts` | Zustand stores (signed-in user, current session). |

A roll returns a `RollOutcome` (pan + reward + achievements + events); apply it with
`features/generation/applyRollOutcome.ts`, never by refetching the user and diffing XP.

## Commits

**Subject only, by default.** One line, imperative, no ticket prefix. Most commits need no body.

**A body, when the subject can't carry it, is a comma-separated list of short labels** — the
areas touched, a few words each. Not sentences, no rationale, no before/after narrative:

```
Deepen pan roll and achievements

Pan roll module, Achievement facts, Read-only achievement list, Roll outcome in meta
```

**Never add a `Co-Authored-By:` trailer** or any other authorship/tool attribution.

`master` is the main branch; work on a feature branch.

## Commands

Run from the repo root unless noted. The venv is `venv/`; it has drifted from
`requirements.txt` before — rebuild it (`pip install -r requirements.txt`) if imports fail.

```bash
venv/bin/python -m unittest discover -s back/test -t .     # whole backend suite
venv/bin/python -m unittest back.test.integration.test_pan_roll   # one module
venv/bin/python -m back.src.main                           # run the server (port 8081)

cd front && CI=true npx jest <path>      # one test file — the edit loop
cd front && CI=true npx jest             # whole frontend suite
cd front && npx tsc --noEmit             # type check
cd front && npm start                    # dev server
```

`npm run lint` is broken (eslint can't find a config). The view tests under `features/` and
`shared/` fail to load (antd locale import, stale mock paths); `lib/api`, `model` and
`features/generation/applyRollOutcome` tests are the ones that run.

## Verify what you changed, not the whole repo

| Changed only | Loop with |
|---|---|
| `back/` | the touched test module, then the whole backend suite |
| `front/src/` | `npx jest <path>`, then `npx tsc --noEmit`, then the whole frontend suite |
| both sides | the two rows above; also check the wire contract (below) |

- **Narrowest first.** A single test module before its suite.
- **The sides are independent.** A `back/`-only change can't break the frontend's tests,
  except through the wire format.
- **Wire contract.** Changing a response shape means changing the matching mapper in
  `front/src/lib/api/mappers.ts` and its fixture in `lib/api/__fixtures__/wire.ts`.

## Testing

- **Backend:** `unittest`. Pure logic gets a plain `TestCase` (`test/unit/`). Anything
  touching the DB or routes subclasses `AppTest` from `back/test/support.py` (`test/integration/`):
  real app, in-memory SQLite, fresh schema and default data per test, builders
  (`make_user`, `make_session`, `make_ingredient`, `make_pan`), `auth()` and `post()` helpers.
- **Frontend:** jest. Test `lib/api` through `FakeTransport` (`setTransport(fake)`), not by
  mocking axios. `setupTests.js` mocks `./lib/api` globally; real-module tests opt out with
  `jest.unmock("./index")`.
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
- **Responses** are JSON:API-ish: `{jsonapi, data: {type, id, attributes}, meta}`. Roll
  endpoints carry `meta.reward`, `meta.newly_unlocked_achievements`, `meta.events`.
