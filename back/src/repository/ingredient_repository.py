from typing import Any

from sqlalchemy import Row
from sqlalchemy.exc import NoResultFound

from back.src.driver.database import db
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.diet import Diet
from back.src.repository.base_repository import BaseRepository


class IngredientRepository(BaseRepository[Ingredient]):
    """Repository for Ingredient entities."""

    def __init__(self) -> None:
        super().__init__(Ingredient)

    def by_session(self, session_key: str) -> list[Ingredient]:
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Ingredient).filter_by(session_id=session.id).all()
        except NoResultFound:
            return []

    def by_type(self, session_key: str, ingredient_type: IngredientType) -> list[Ingredient]:
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Ingredient).filter_by(session_id=session.id, type=ingredient_type).all()
        except NoResultFound:
            return []

    def filter_by_preferences(self, session_key: str, diet: Diet, ingredient_type: IngredientType) -> list[Ingredient]:
        """Available, named ingredients of one type in a session that the diet allows."""
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
        except NoResultFound:
            return []

        return (
            db.session.query(Ingredient)
            .filter(
                Ingredient.session_id == session.id,
                Ingredient.type == ingredient_type,
                Ingredient.available.is_(True),
                Ingredient.name.is_not(None),
                Ingredient.name != "",
                diet.ingredient_filter(),
            )
            .order_by(Ingredient.id)
            .all()
        )

    def mark_unavailable(self, id: int) -> Ingredient | None:
        ingredient = self.by_id(id)
        if not ingredient:
            return None

        ingredient.available = False
        db.session.flush()
        return ingredient

    def mark_available(self, id: int) -> Ingredient | None:
        ingredient = self.by_id(id)
        if not ingredient:
            return None

        ingredient.available = True
        db.session.flush()
        return ingredient

    def by_session_ids(self, session_ids: list[int], ingredient_type: IngredientType | None = None) -> list[Ingredient]:
        if not session_ids:
            return []

        query = db.session.query(Ingredient).filter(Ingredient.session_id.in_(session_ids))

        if ingredient_type:
            query = query.filter(Ingredient.type == ingredient_type)

        return query.all()

    def get_top_rated(self, session_id: int | None = None, limit: int = 10) -> list[Row[Ingredient, float]]:
        """Get top-rated ingredients by average rating."""
        from sqlalchemy import func

        from back.src.entity.pan import Pan, pan_ingredients
        from back.src.entity.rating import Rating

        query = (
            db.session.query(Ingredient, func.avg(Rating.rating).label("avg_rating"))
            .join(pan_ingredients, pan_ingredients.c.ingredient_id == Ingredient.id)
            .join(Pan, Pan.id == pan_ingredients.c.pan_id)
            .join(Rating, Rating.pan_id == Pan.id)
        )

        if session_id:
            query = query.filter(Ingredient.session_id == session_id)

        rows: list[Row[Ingredient, float]] = (
            query.group_by(Ingredient.id).order_by(func.avg(Rating.rating).desc()).limit(limit).all()
        )
        return rows

    def best_rated_in_pans(self, pan_ids: list[int]) -> Row[Ingredient, float] | None:
        """The ingredient with the highest average rating over the given pans it was in, and that average."""
        from sqlalchemy import func

        from back.src.entity.pan import pan_ingredients
        from back.src.entity.rating import Rating

        if not pan_ids:
            return None
        row: Row[Ingredient, float] | None = (
            db.session.query(Ingredient, func.avg(Rating.rating))
            .join(pan_ingredients, pan_ingredients.c.ingredient_id == Ingredient.id)
            .join(Rating, Rating.pan_id == pan_ingredients.c.pan_id)
            .filter(pan_ingredients.c.pan_id.in_(pan_ids))
            .group_by(Ingredient.id)
            .order_by(func.avg(Rating.rating).desc())
            .first()
        )
        return row

    def get_most_used(self, session_id: int | None = None, limit: int = 10) -> list[Row[Ingredient, int]]:
        """Get most-used ingredients by pan count."""
        from sqlalchemy import func

        from back.src.entity.pan import Pan, pan_ingredients

        query = (
            db.session.query(Ingredient, func.count(Pan.id).label("pan_count"))
            .join(pan_ingredients, pan_ingredients.c.ingredient_id == Ingredient.id)
            .join(Pan, Pan.id == pan_ingredients.c.pan_id)
        )

        if session_id:
            query = query.filter(Ingredient.session_id == session_id)

        return query.group_by(Ingredient.id).order_by(func.count(Pan.id).desc()).limit(limit).all()

    def bulk_create(self, ingredients_data: list[dict[str, Any]], session_id: int) -> list[Ingredient]:
        from back.src.entity.raclotto_session import RaclottoSession

        session = db.session.query(RaclottoSession).filter_by(id=session_id).first()
        if not session:
            raise ValueError(f"Session with id {session_id} not found")

        created_ingredients = []
        for data in ingredients_data:
            # Convert type to IngredientType if provided
            if "type" in data and isinstance(data["type"], int):
                data["type"] = IngredientType(data["type"])

            # Set session relationship
            data["session"] = session

            # Create ingredient
            ingredient = Ingredient(**data)
            db.session.add(ingredient)
            created_ingredients.append(ingredient)

        db.session.flush()
        return created_ingredients

    def bulk_update(self, ingredients_data: list[dict[str, Any]]) -> list[Ingredient]:
        updated_ingredients = []

        for data in ingredients_data:
            if "id" not in data:
                continue

            ingredient_id = data.pop("id")
            ingredient = self.by_id(ingredient_id)

            if not ingredient:
                continue

            # Convert type to IngredientType if provided
            if "type" in data and isinstance(data["type"], int):
                data["type"] = IngredientType(data["type"])

            # Remove session_id if present (shouldn't change session via update)
            data.pop("session_id", None)
            data.pop("session", None)

            # Update attributes
            for key, value in data.items():
                if hasattr(ingredient, key):
                    setattr(ingredient, key, value)

            updated_ingredients.append(ingredient)

        db.session.flush()
        return updated_ingredients

    def mark_unavailable_by_ids(self, ingredient_ids: list[int]) -> int:
        if not ingredient_ids:
            return 0

        count = (
            db.session.query(Ingredient)
            .filter(Ingredient.id.in_(ingredient_ids))
            .update({Ingredient.available: False}, synchronize_session=False)
        )

        db.session.flush()
        return count
