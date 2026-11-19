# Diet is the one translation between ingredient categories and a user's diet

- Status: accepted
- Date: 2026-11-18 (`7cc6b2b` Add diet eligibility module)

## Context

The same four words, meat, vegetarian, vegan and fish, mean two different things. On an
ingredient they are a category: exactly one is set, enforced by check constraints on the
`ingredient` table and by `category_problem` before a request reaches it. On a user they are a
diet, read as "I eat": a hierarchy (meat ⇒ vegetarian ⇒ vegan) with fish independent of it. The
allergen flags differ the same way: "contains" on an ingredient, "tolerates" on a user.

Before this module the hierarchy lived in `GenerationPreferences` in `entity/ingredient.py`, without
fish, and the routes for ingredients, pans and auth and the ingredient repository each applied
their own version of the check.

## Decision

`Diet` in `back/src/interactor/diet.py` is the only place that reads a user's flags as a diet.
It normalizes a diet (an empty one becomes vegetarian), writes it back onto a user, and answers
whether an ingredient fits: `allows` in Python, `ingredient_filter` as the equivalent SQL clause.
Rolls, the per-user `applicable` flag on ingredients and the available counts all ask it.

## Consequences

- Changing who may eat what is a change to one module and its unit tests (`test_diet.py`).
- `allows` and `ingredient_filter` encode the same rule twice, once per language; they change together.
- An ingredient's category flags and a user's diet flags share column names but never compare
  directly; code that does so bypasses `Diet` and is wrong.
- A hand-picked pan does not go through `Diet`: it takes any ingredient of the session.
