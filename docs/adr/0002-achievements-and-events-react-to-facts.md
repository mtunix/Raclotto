# Achievements and events react to facts, inside the caller's transaction

- Status: accepted
- Date: 2026-11-18 (`158b9f9` Deepen pan roll and achievements), extended to events on
  2026-11-19 (`d35a263` Deepen session events)

## Context

About 35 achievements and one event type depend on what happens in a session: pans rolled and
rated, ingredients added, catalogs changed, sessions closed. Some judge the actor, some the pan's
author, some everyone in the session; two can be lost again. The facts arrive from several
routes and from the roll.

## Decision

Callers report what happened as a fact (`interactor/facts.py`: `PanRolled`, `PanRated`,
`IngredientAdded`, `CatalogChanged`, `SessionClosed`) to `Achievements.record` and `Events.record`.
Each achievement or event type has one evaluator that declares the facts it `reacts_to`; an
achievement evaluator also declares its `audience` and whether it is `revocable`, an event
evaluator its `event_type` and default `cooldown`. Achievement evaluators are found by the
achievement's title.

`record` flushes but never commits. The caller commits the fact's change and its consequences
together; `PanRoll.roll` does the whole roll (ingredients, membership, XP, events, achievements)
in one transaction and builds the response before the commit (`roll_into`).

## Consequences

- A new achievement or event type is a new evaluator; routes do not change, and no code outside
  the evaluator special-cases an achievement by its title.
- A failed roll or rating leaves no half-awarded achievement or orphaned event behind.
- An event evaluator that raises is logged and skipped, so events never fail a roll; an
  achievement evaluator that raises fails the request.
- The original reason for choosing facts over direct calls is not recorded beyond the commit
  subjects; the forces above are what the code shows.
