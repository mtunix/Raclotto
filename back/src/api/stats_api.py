from flask import request
from back.src.api.base_api import BaseApi
from back.src.auth.middleware import require_auth
from back.src.repository.pan_repository import PanRepository
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository
from back.src.driver.database import db


class StatsApi(BaseApi):
    url_prefix = "/stats"
    
    def __init__(self):
        super().__init__()
        self.pan_repository = PanRepository()
        self.ingredient_repository = IngredientRepository()
        self.session_repository = SessionRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def get_stats(self):
        """Get statistics for a session.
        
        Query parameters:
        - session_key: Optional session key to filter by
        
        :returns Dict: Statistics including pans, top-rated ingredients, most-used ingredients
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        session_key = request.args.get('session_key')
        
        # Get pans
        if session_key:
            pans = self.pan_repository.by_session(session_key)
            session = self.session_repository.by_key(session_key)
            if not session:
                return {
                    "pans": [],
                    "ingredients_top_rated": [],
                    "ingredients_most_used": []
                }
        else:
            pans = self.pan_repository.all()
            session = None
        
        # Get top-rated ingredients (by average rating)
        session_id = session.id if session else None
        top_rated_results = self.ingredient_repository.get_top_rated(session_id, limit=10)
        
        top_rated = []
        for ingredient, avg_rating in top_rated_results:
            ingredient_dict = ingredient.to_dict() if hasattr(ingredient, 'to_dict') else {
                'id': ingredient.id,
                'name': ingredient.name,
                'type': ingredient.type.value if hasattr(ingredient.type, 'value') else ingredient.type,
                'meat': ingredient.meat,
                'vegetarian': ingredient.vegetarian,
                'vegan': ingredient.vegan,
                'gluten': ingredient.gluten,
                'histamine': ingredient.histamine,
                'fructose': ingredient.fructose,
                'lactose': ingredient.lactose,
                'available': ingredient.available
            }
            ingredient_dict['avg_rating'] = float(avg_rating) if avg_rating else 0.0
            top_rated.append(ingredient_dict)
        
        # Get most-used ingredients (by pan count)
        most_used_results = self.ingredient_repository.get_most_used(session_id, limit=10)
        
        most_used = []
        for ingredient, pan_count in most_used_results:
            ingredient_dict = ingredient.to_dict() if hasattr(ingredient, 'to_dict') else {
                'id': ingredient.id,
                'name': ingredient.name,
                'type': ingredient.type.value if hasattr(ingredient.type, 'value') else ingredient.type,
                'meat': ingredient.meat,
                'vegetarian': ingredient.vegetarian,
                'vegan': ingredient.vegan,
                'gluten': ingredient.gluten,
                'histamine': ingredient.histamine,
                'fructose': ingredient.fructose,
                'lactose': ingredient.lactose,
                'available': ingredient.available
            }
            ingredient_dict['pan_count'] = int(pan_count) if pan_count else 0
            most_used.append(ingredient_dict)
        
        return {
            "pans": [pan.as_dict() if hasattr(pan, 'as_dict') else pan.to_dict() for pan in pans],
            "ingredients_top_rated": top_rated,
            "ingredients_most_used": most_used
        }
