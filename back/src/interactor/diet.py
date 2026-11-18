"""Diet eligibility: the one rule for what a user's diet lets them eat.

Two different vocabularies meet here:

* A user's diet is hierarchical ("I eat ..."): meat ⊃ vegetarian ⊃ vegan.
  Fish is independent of that hierarchy (a vegetarian may eat fish, an
  omnivore may not). The substance flags (histamine, fructose, lactose,
  gluten) mean "tolerates".
* An ingredient belongs to exactly one category (meat, vegetarian, vegan or
  fish) and its substance flags mean "contains".

Every place that needs to know whether an ingredient fits a user asks
``Diet.allows`` (in Python) or ``Diet.ingredient_filter`` (in SQL); both
encode the same rule.
"""

from dataclasses import dataclass, fields, replace

from sqlalchemy import and_, not_, true

CATEGORIES = ("meat", "vegetarian", "vegan", "fish")
SUBSTANCES = ("histamine", "fructose", "lactose", "gluten")


@dataclass(frozen=True)
class Diet:
    meat: bool = False
    vegetarian: bool = True
    vegan: bool = True
    fish: bool = False
    histamine: bool = True
    fructose: bool = True
    lactose: bool = True
    gluten: bool = True

    @classmethod
    def of(cls, user) -> "Diet":
        """The normalized diet stored on a user (or any object with the same flags)."""
        return cls(**{f.name: bool(getattr(user, f.name)) for f in fields(cls)}).normalized()

    def normalized(self) -> "Diet":
        """Apply the hierarchy: meat ⇒ vegetarian ⇒ vegan; an empty diet becomes vegetarian."""
        if self.meat:
            return replace(self, vegetarian=True, vegan=True)
        if self.vegetarian:
            return replace(self, vegan=True)
        if not self.vegan:
            return replace(self, vegetarian=True, vegan=True)
        return self

    def apply_to(self, user) -> None:
        """Write this diet (normalized) onto a user."""
        for f in fields(self):
            setattr(user, f.name, getattr(self.normalized(), f.name))

    def allows(self, ingredient) -> bool:
        diet = self.normalized()
        for flag in CATEGORIES + SUBSTANCES:
            if getattr(ingredient, flag) and not getattr(diet, flag):
                return False
        return True

    def ingredient_filter(self):
        """SQLAlchemy clause over ``Ingredient`` equivalent to ``allows``."""
        from back.src.entity.ingredient import Ingredient

        diet = self.normalized()
        excluded = [
            not_(getattr(Ingredient, flag))
            for flag in CATEGORIES + SUBSTANCES
            if not getattr(diet, flag)
        ]
        return and_(true(), *excluded)
