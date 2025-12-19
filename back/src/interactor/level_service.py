from typing import Optional
from back.src.entity.user import User
from back.src.entity.pan import Pan
from back.src.entity.level import Level
from back.src.entity.ingredient import IngredientType
from back.src.repository.level_repository import LevelRepository
from back.src.repository.user_repository import UserRepository
from back.src.driver.database import db


class LevelService:
    """Service for managing user levels and experience points."""
    
    def __init__(self):
        self.level_repository = LevelRepository()
        self.user_repository = UserRepository()
    
    def calculate_level_from_xp(self, experience_points: int) -> Optional[Level]:
        """
        Calculate the user's current level based on experience points.
        
        :param experience_points: User's total experience points
        :return: Level instance or None if no level found
        """
        return self.level_repository.by_experience(experience_points)
    
    def update_user_level(self, user: User) -> Optional[Level]:
        """
        Update user's level based on their current experience points.
        
        :param user: User instance
        :return: New level if changed, None otherwise
        """
        new_level = self.calculate_level_from_xp(user.experience_points)
        
        if new_level:
            old_level_id = user.level_id
            user.level_id = new_level.id
            
            # Return new level if it changed
            if old_level_id != new_level.id:
                db.session.flush()
                return new_level
        
        return None
    
    def award_xp_for_pan(self, user: User, pan: Pan) -> int:
        """
        Award experience points for eating a pan.
        XP is calculated based on ingredient count with multipliers for special combinations.
        
        XP per ingredient based on total count:
        - ≤4 ingredients: 5 XP each
        - 5-6 ingredients: 7 XP each
        - 7 ingredients: 9 XP each
        - 8-10 ingredients: 11 XP each
        - >10 ingredients: 13 XP each
        
        Multipliers (highest applies):
        - Wildcard ingredient: 1.5x
        - Spicy (>=2) + Wildcard: 1.7x
        - Spicy (>=2) + Sweet: 1.25x
        
        :param user: User who ate the pan
        :param pan: Pan that was eaten
        :return: Amount of XP awarded
        """
        if not pan.ingredients:
            return 0
        
        # Calculate total ingredient count (fills + sauces)
        total_ingredients = len(pan.ingredients)
        
        # Determine XP per ingredient based on count
        # Up to 4: 5 XP each
        # Exceeds 4 but less than 6 (i.e., 5): 7 XP each
        # 6-7: 9 XP each (since 8-10 has higher XP, we prioritize that range)
        # 8-10: 11 XP each
        # Above 10: 13 XP each
        if total_ingredients <= 4:
            xp_per_ingredient = 5
        elif total_ingredients == 5:
            xp_per_ingredient = 7
        elif total_ingredients <= 7:
            xp_per_ingredient = 9
        elif total_ingredients <= 10:
            xp_per_ingredient = 11
        else:
            xp_per_ingredient = 13
        
        # Calculate base total (ingredients * xp_per + base XP of 10)
        base_total = (total_ingredients * xp_per_ingredient) + 10
        
        # Check for special ingredient combinations
        has_wildcard = any(ing.wildcard for ing in pan.ingredients)
        has_spicy = any(ing.spicy >= 2 for ing in pan.ingredients)
        has_sweet = any(ing.sweet for ing in pan.ingredients)
        
        # Determine multiplier (highest only: 1.7 > 1.5 > 1.25)
        multiplier = 1.0
        if has_spicy and has_wildcard:
            multiplier = 1.7
        elif has_wildcard:
            multiplier = 1.5
        elif has_spicy and has_sweet:
            multiplier = 1.25
        
        # Apply rolling bonuses (these stack multiplicatively)
        if pan.rolled_preparation_type:
            multiplier *= 1.1
        if pan.rolled_cheese:
            multiplier *= 1.2
        
        # Calculate final XP (rounded to integer)
        total_xp = int(base_total * multiplier)
        
        # Award XP
        user.experience_points += total_xp
        
        # Update user's level
        self.update_user_level(user)
        
        db.session.flush()
        
        return total_xp

