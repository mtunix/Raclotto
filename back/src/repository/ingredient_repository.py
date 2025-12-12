from typing import List, Optional
from random import sample
import random
from sqlalchemy import or_, not_
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import joinedload
from back.src.repository.base_repository import BaseRepository
from back.src.entity.ingredient import Ingredient, IngredientType, GenerationParameters, GenerationPreferences
from back.src.entity.raclotto_session import RaclottoSession
from back.src.driver.database import db


class IngredientRepository(BaseRepository[Ingredient]):
    """Repository for Ingredient entities."""
    
    def __init__(self):
        super().__init__(Ingredient)
    
    def by_session(self, session_key: str) -> List[Ingredient]:
        """
        Get all ingredients for a session.
        
        :param session_key: Session key
        :return: List of ingredients
        """
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Ingredient).filter_by(session_id=session.id).all()
        except NoResultFound:
            return []
    
    def by_type(self, session_key: str, ingredient_type: IngredientType) -> List[Ingredient]:
        """
        Get ingredients by type for a session.
        
        :param session_key: Session key
        :param ingredient_type: Type of ingredient (FILL or SAUCE)
        :return: List of ingredients
        """
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            return db.session.query(Ingredient).filter_by(
                session_id=session.id,
                type=ingredient_type
            ).all()
        except NoResultFound:
            return []
    
    def filter_by_preferences(
        self,
        session_key: str,
        preferences: GenerationPreferences,
        ingredient_type: IngredientType
    ) -> List[Ingredient]:
        """
        Filter ingredients by user preferences.
        
        :param session_key: Session key
        :param preferences: User food preferences
        :param ingredient_type: Type of ingredient (FILL or SAUCE)
        :return: Filtered list of ingredients
        """
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
        except NoResultFound:
            return []
        
        query = db.session.query(Ingredient).filter(
            Ingredient.session_id == session.id,
            Ingredient.type == ingredient_type,
            Ingredient.available == True,
            Ingredient.name != None,
            Ingredient.name != ""
        )
        
        # Apply preference filters
        if not preferences.meat:
            if preferences.vegetarian:
                query = query.filter(or_(Ingredient.vegetarian, Ingredient.vegan))
            elif preferences.vegan:
                query = query.filter(Ingredient.vegan)
        
        if not preferences.fructose:
            query = query.filter(not_(Ingredient.fructose))
        
        if not preferences.histamine:
            query = query.filter(not_(Ingredient.histamine))
        
        if not preferences.gluten:
            query = query.filter(not_(Ingredient.gluten))
        
        if not preferences.lactose:
            query = query.filter(not_(Ingredient.lactose))
        
        return query.all()
    
    def mark_unavailable(self, id: int) -> Optional[Ingredient]:
        """
        Mark an ingredient as unavailable.
        
        :param id: Ingredient ID
        :return: Updated ingredient or None if not found
        """
        ingredient = self.by_id(id)
        if not ingredient:
            return None
        
        ingredient.available = False
        db.session.flush()
        return ingredient
    
    def mark_available(self, id: int) -> Optional[Ingredient]:
        """
        Mark an ingredient as available.
        
        :param id: Ingredient ID
        :return: Updated ingredient or None if not found
        """
        ingredient = self.by_id(id)
        if not ingredient:
            return None
        
        ingredient.available = True
        db.session.flush()
        return ingredient
    
    def all_with_type(self, session_key: Optional[str] = None, of_type: Optional[IngredientType] = None) -> List[Ingredient]:
        """
        Get ingredients with session relation loaded.
        Optionally filter by session_key and/or type.
        
        :param session_key: Optional session key to filter by
        :param of_type: Optional ingredient type to filter by
        :return: List of ingredients with session relation loaded
        """
        query = db.session.query(Ingredient).options(joinedload(Ingredient.session))
        
        if session_key:
            try:
                session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
                query = query.filter(Ingredient.session_id == session.id)
            except NoResultFound:
                return []
        
        if of_type:
            query = query.filter(Ingredient.type == of_type)
        
        return query.all()
    
    def select_random(self, gen_dict: GenerationParameters) -> List[Ingredient]:
        """
        Select random ingredients based on generation parameters.
        This is a data access method that performs random sampling.
        
        :param gen_dict: Generation parameters
        :return: List of randomly selected ingredients
        """
        random.seed()
        fills = self.filter_by_preferences(gen_dict.session_key, gen_dict.preferences, IngredientType.FILL)
        sauces = self.filter_by_preferences(gen_dict.session_key, gen_dict.preferences, IngredientType.SAUCE)
        num_fill = gen_dict.num_fill if len(fills) >= gen_dict.num_fill else len(fills)
        num_sauce = gen_dict.num_sauce if len(sauces) >= gen_dict.num_sauce else len(sauces)
        return sample(fills, num_fill) + sample(sauces, num_sauce)
    
    def by_session_ids(self, session_ids: List[int], ingredient_type: Optional[IngredientType] = None) -> List[Ingredient]:
        """
        Get ingredients from multiple sessions.
        
        :param session_ids: List of session IDs
        :param ingredient_type: Optional ingredient type to filter by
        :return: List of ingredients
        """
        if not session_ids:
            return []
        
        query = db.session.query(Ingredient).filter(Ingredient.session_id.in_(session_ids))
        
        if ingredient_type:
            query = query.filter(Ingredient.type == ingredient_type)
        
        return query.all()
    
    def all_with_session(self) -> List[Ingredient]:
        """
        Get all ingredients with session relation loaded.
        
        :return: List of ingredients with session relation loaded
        """
        return db.session.query(Ingredient).options(joinedload(Ingredient.session)).all()
    
    def get_top_rated(self, session_id: Optional[int] = None, limit: int = 10) -> List[tuple]:
        """
        Get top-rated ingredients by average rating.
        
        :param session_id: Optional session ID to filter by
        :param limit: Maximum number of results
        :return: List of tuples (Ingredient, avg_rating)
        """
        from sqlalchemy import func
        from back.src.entity.pan import Pan, pan_ingredients
        from back.src.entity.rating import Rating
        
        query = db.session.query(
            Ingredient,
            func.avg(Rating.rating).label('avg_rating')
        ).join(
            pan_ingredients, pan_ingredients.c.ingredient_id == Ingredient.id
        ).join(
            Pan, Pan.id == pan_ingredients.c.pan_id
        ).join(
            Rating, Rating.pan_id == Pan.id
        )
        
        if session_id:
            query = query.filter(Ingredient.session_id == session_id)
        
        return query.group_by(Ingredient.id).order_by(
            func.avg(Rating.rating).desc()
        ).limit(limit).all()
    
    def get_most_used(self, session_id: Optional[int] = None, limit: int = 10) -> List[tuple]:
        """
        Get most-used ingredients by pan count.
        
        :param session_id: Optional session ID to filter by
        :param limit: Maximum number of results
        :return: List of tuples (Ingredient, pan_count)
        """
        from sqlalchemy import func
        from back.src.entity.pan import Pan, pan_ingredients
        
        query = db.session.query(
            Ingredient,
            func.count(Pan.id).label('pan_count')
        ).join(
            pan_ingredients, pan_ingredients.c.ingredient_id == Ingredient.id
        ).join(
            Pan, Pan.id == pan_ingredients.c.pan_id
        )
        
        if session_id:
            query = query.filter(Ingredient.session_id == session_id)
        
        return query.group_by(Ingredient.id).order_by(
            func.count(Pan.id).desc()
        ).limit(limit).all()
    
    def bulk_create(self, ingredients_data: List[dict], session_id: int) -> List[Ingredient]:
        """
        Create multiple ingredients in bulk.
        
        :param ingredients_data: List of ingredient attribute dictionaries
        :param session_id: Session ID to associate ingredients with
        :return: List of created ingredient instances
        """
        from back.src.entity.raclotto_session import RaclottoSession
        
        session = db.session.query(RaclottoSession).filter_by(id=session_id).first()
        if not session:
            raise ValueError(f"Session with id {session_id} not found")
        
        created_ingredients = []
        for data in ingredients_data:
            # Convert type to IngredientType if provided
            if 'type' in data and isinstance(data['type'], int):
                data['type'] = IngredientType(data['type'])
            
            # Set session relationship
            data['session'] = session
            
            # Create ingredient
            ingredient = Ingredient(**data)
            db.session.add(ingredient)
            created_ingredients.append(ingredient)
        
        db.session.flush()
        return created_ingredients
    
    def bulk_update(self, ingredients_data: List[dict]) -> List[Ingredient]:
        """
        Update multiple ingredients in bulk.
        
        :param ingredients_data: List of ingredient dictionaries with 'id' field
        :return: List of updated ingredient instances
        """
        updated_ingredients = []
        
        for data in ingredients_data:
            if 'id' not in data:
                continue
            
            ingredient_id = data.pop('id')
            ingredient = self.by_id(ingredient_id)
            
            if not ingredient:
                continue
            
            # Convert type to IngredientType if provided
            if 'type' in data and isinstance(data['type'], int):
                data['type'] = IngredientType(data['type'])
            
            # Remove session_id if present (shouldn't change session via update)
            data.pop('session_id', None)
            data.pop('session', None)
            
            # Update attributes
            for key, value in data.items():
                if hasattr(ingredient, key):
                    setattr(ingredient, key, value)
            
            updated_ingredients.append(ingredient)
        
        db.session.flush()
        return updated_ingredients
    
    def mark_unavailable_by_ids(self, ingredient_ids: List[int]) -> int:
        """
        Mark multiple ingredients as unavailable by their IDs.
        
        :param ingredient_ids: List of ingredient IDs to mark as unavailable
        :return: Number of ingredients updated
        """
        if not ingredient_ids:
            return 0
        
        count = db.session.query(Ingredient).filter(
            Ingredient.id.in_(ingredient_ids)
        ).update({Ingredient.available: False}, synchronize_session=False)
        
        db.session.flush()
        return count
