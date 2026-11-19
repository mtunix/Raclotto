"""An ingredient belongs to exactly one of the categories meat, vegetarian, vegan and fish.

The ingredient table's CheckConstraints enforce the same rule; `category_problem` says which part
of it a set of flags breaks, so requests are rejected before they reach the database.
"""


def category_problem(meat: bool, vegetarian: bool, vegan: bool, fish: bool) -> str | None:
    """Why the flags are not exactly one category, or None when they are."""
    if not (meat or vegetarian or vegan or fish):
        return "must have at least one of meat, vegetarian, vegan, or fish set to true"
    if meat and (vegetarian or vegan or fish):
        return "cannot have meat=true with vegetarian, vegan, or fish=true (they are mutually exclusive)"
    if vegetarian and (vegan or fish):
        return "cannot have vegetarian=true with vegan or fish=true (they are mutually exclusive)"
    if vegan and fish:
        return "cannot have both vegan=true and fish=true (they are mutually exclusive)"
    return None
