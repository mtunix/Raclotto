# Build the frontend with Vite, Vitest and Playwright

- Status: accepted
- Date: 2026-11-19 (`d4c26e4` Move the frontend to Vite, Vitest and Playwright)

## Context

The frontend was an ejected Create React App: webpack 5, Babel via `config/babelPreset.js`, jest
30 with its own transforms and `__mocks__`, and the start, build and test scripts in
`front/scripts/`, all maintained in the repo. TypeScript stays on 6 because TS 7's native compiler
has no JS API yet, which `@typescript-eslint` needs.

## Decision

- Vite 8 builds and serves the app (`vite.config.ts`); the dev server runs on
  https://localhost:3001 and proxies `/api` to the backend on 8081. `index.html` moved to `front/`.
- Vitest 5 runs the unit and view tests, configured in the same `vite.config.ts`, with jest-style
  globals and `vi.*`.
- Playwright (`front/e2e/`, `playwright.config.ts`) runs end-to-end tests against
  `back.src.main` serving the production build, with a throwaway database and generated admin
  password, never a dev server. CI runs it as its own job, and the Docker image job waits for it.
- Type checking is `tsc -b` over a solution `tsconfig.json` that references
  `tsconfig.app.json` (`src`) and `tsconfig.node.json` (tool configs). The root config lists no
  files, so a plain `tsc --noEmit` checks nothing. `npm run build` runs `tsc -b` first.
- ESLint uses the type-checked recommended sets of `typescript-eslint` and `@eslint-react`, plus
  `jsx-a11y`, over all of `front/` except the generated client.
- The ejected CRA config, scripts and jest setup are gone.

## Consequences

- The build toolchain is dependencies, not code the repo maintains.
- Commands changed: `npx vitest run` replaces `npx jest`, `npx tsc -b` replaces `tsc --noEmit`.
- End-to-end tests cover the production build and server together, at the cost of a build per run.
- The reasons for the move beyond what the commit shows are not recorded.
