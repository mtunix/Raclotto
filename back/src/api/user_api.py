from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth
from back.src.repository.user_repository import UserRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository
from back.src.api.serializer import serialize_entity
from back.src.api.constants import JSONAPI_VERSION
from back.src.driver.database import db
from sqlalchemy import func
from typing import Dict, Any, Optional
from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan, pan_ingredients
from back.src.entity.rating import Rating


class UserApi(BaseApi):
    url_prefix = "/users"
    
    def __init__(self):
        super().__init__()
        self.user_repository = UserRepository()
        self.pan_repository = PanRepository()
        self.rating_repository = RatingRepository()
    
    @BaseApi.endpoint("/<int:user_id>", ["GET"])
    @require_auth
    def get_user_profile(self, user_id: int):
        """Get user profile by ID.
        
        :param user_id: User ID
        :returns User: User profile data
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: User not found
        """
        user = self.user_repository.by_id(user_id)
        if not user:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="User not found",
                detail=f"User with ID {user_id} does not exist"
            )
        
        # Serialize user but exclude password
        entity_data = serialize_entity(user, "user")
        if entity_data and 'attributes' in entity_data:
            # Remove password from attributes for security
            entity_data['attributes'].pop('password', None)
            # Include achievements in the response
            if user.achievements:
                entity_data['attributes']['achievements'] = [
                    {
                        'id': ach.id,
                        'title': ach.title,
                        'description': ach.description,
                        'value': ach.value,
                        'hidden': ach.hidden
                    }
                    for ach in user.achievements
                ]
            # Include level information
            from back.src.repository.level_repository import LevelRepository
            level_repository = LevelRepository()
            
            if user.level:
                current_level = user.level
                next_level = level_repository.next_level(current_level)
                entity_data['attributes']['level'] = {
                    'id': current_level.id,
                    'name': current_level.name,
                    'required_experience': current_level.required_experience
                }
                if next_level:
                    entity_data['attributes']['next_level'] = {
                        'id': next_level.id,
                        'name': next_level.name,
                        'required_experience': next_level.required_experience
                    }
            else:
                # If user has no level, assign the first level (Novice)
                first_level = level_repository.all_ordered()[0] if level_repository.all_ordered() else None
                if first_level:
                    user.level_id = first_level.id
                    db.session.commit()
                    entity_data['attributes']['level'] = {
                        'id': first_level.id,
                        'name': first_level.name,
                        'required_experience': first_level.required_experience
                    }
                    next_level = level_repository.next_level(first_level)
                    if next_level:
                        entity_data['attributes']['next_level'] = {
                            'id': next_level.id,
                            'name': next_level.name,
                            'required_experience': next_level.required_experience
                        }
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": entity_data
        }
    
    @BaseApi.endpoint("/<int:user_id>/stats", ["GET"])
    @require_auth
    def get_user_stats(self, user_id: int):
        """Get user statistics.
        
        :param user_id: User ID
        :returns Dict: User statistics including pans, ratings, achievements, etc.
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: User not found
        """
        user = self.user_repository.by_id(user_id)
        if not user:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="User not found",
                detail=f"User with ID {user_id} does not exist"
            )
        
        # Calculate statistics
        stats = self._calculate_user_stats(user_id)
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": {
                "type": "userStats",
                "id": str(user_id),
                "attributes": stats
            }
        }
    
    def _calculate_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Calculate comprehensive user statistics.
        
        :param user_id: User ID
        :return: Dictionary with statistics
        """
        # 1. Total pans created by user
        user_pans = self.pan_repository.by_user(user_id)
        total_pans = len(user_pans)
        
        # 2. Total ratings given by user
        total_ratings_given = self.rating_repository.count_by_user(user_id)
        
        # 3. Average rating received (average of all ratings on user's pans)
        if user_pans:
            pan_ids = [pan.id for pan in user_pans]
            avg_rating_result = db.session.query(
                func.avg(Rating.rating)
            ).filter(
                Rating.pan_id.in_(pan_ids)
            ).scalar()
            average_rating_received = float(avg_rating_result) if avg_rating_result else 0.0
        else:
            average_rating_received = 0.0
        
        # 4. Favorite ingredient (most frequently used in user's pans)
        favorite_ingredient = None
        if user_pans:
            ingredient_counts = {}
            for pan in user_pans:
                for ingredient in pan.ingredients:
                    ingredient_id = ingredient.id
                    ingredient_counts[ingredient_id] = ingredient_counts.get(ingredient_id, 0) + 1
            
            if ingredient_counts:
                most_used_id = max(ingredient_counts.items(), key=lambda x: x[1])[0]
                favorite_ingredient_obj = db.session.query(Ingredient).filter_by(id=most_used_id).first()
                if favorite_ingredient_obj:
                    favorite_ingredient = {
                        'id': favorite_ingredient_obj.id,
                        'name': favorite_ingredient_obj.name,
                        'type': favorite_ingredient_obj.type.value if hasattr(favorite_ingredient_obj.type, 'value') else str(favorite_ingredient_obj.type)
                    }
        
        # 5. Best rated ingredient (ingredient with highest average rating in user's pans)
        best_rated_ingredient = None
        if user_pans:
            pan_ids = [pan.id for pan in user_pans]
            
            # Get average rating per ingredient across user's pans
            ingredient_ratings = db.session.query(
                pan_ingredients.c.ingredient_id,
                func.avg(Rating.rating).label('avg_rating')
            ).join(
                Pan, Pan.id == pan_ingredients.c.pan_id
            ).join(
                Rating, Rating.pan_id == Pan.id
            ).filter(
                Pan.id.in_(pan_ids)
            ).group_by(
                pan_ingredients.c.ingredient_id
            ).order_by(
                func.avg(Rating.rating).desc()
            ).first()
            
            if ingredient_ratings:
                ingredient_id = ingredient_ratings[0]
                ingredient = db.session.query(Ingredient).filter_by(id=ingredient_id).first()
                if ingredient:
                    best_rated_ingredient = {
                        'id': ingredient.id,
                        'name': ingredient.name,
                        'type': ingredient.type.value if hasattr(ingredient.type, 'value') else str(ingredient.type),
                        'avg_rating': float(ingredient_ratings[1]) if ingredient_ratings[1] else 0.0
                    }
        
        # 6. Total achievement points
        user = self.user_repository.by_id(user_id)
        total_achievement_points = sum(achievement.value for achievement in user.achievements) if user else 0
        
        return {
            'total_pans': total_pans,
            'total_ratings_given': total_ratings_given,
            'average_rating_received': round(average_rating_received, 2),
            'favorite_ingredient': favorite_ingredient,
            'best_rated_ingredient': best_rated_ingredient,
            'total_achievement_points': total_achievement_points
        }

