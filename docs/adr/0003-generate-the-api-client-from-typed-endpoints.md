# Generate the API client from typed endpoint declarations

- Status: accepted
- Date: 2026-11-18 (`8a4884e` Add typed endpoints and OpenAPI export, `812608f` Type the
  remaining endpoints and drop the hand-written client)

## Context

The frontend talked to the backend through a hand-written client that deserialized JSON:API
responses (`deserialize-json-api`). Request and response shapes were stated twice, once in Python
and once in TypeScript, and nothing checked that the two agreed.

## Decision

The backend's Pydantic DTOs are the single source of the wire format.

- Every route is declared with `BaseApi.endpoint(route, methods, query=, body=, response=,
  status=, errors=, operation_id=)`. A declaration without `response=` or `status=204`, or with a
  non-DTO type, fails at class definition; a handler that returns anything but its declared
  response is a 500. Responses are plain JSON.
- `back/src/api/openapi.py` builds `back/openapi.json` from those declarations.
- orval (`front/orval.config.ts`) generates the endpoint functions, SWR hooks, key getters and DTO
  types into `front/src/api/generated/`, calling `orvalMutator` and through it `transport()`.
- `npm run gen:api` does both steps; both outputs are committed and never edited by hand.

## Consequences

- Drift fails CI twice: `test_openapi.py` compares the committed spec with the code and checks
  every routed endpoint is in it, and `npm run gen:api:check` regenerates and fails on any diff.
- A DTO change is: change the DTO, `npm run gen:api`, fix what `tsc -b` reports, rerun
  `export_wire_fixtures`. Call sites use the generated types without casts.
- `operation_id` names the generated function and must be unique across the app.
- Every error status a handler can raise is listed in `errors=` so it appears in the spec.
- Why OpenAPI and orval were picked over alternatives is not recorded.
