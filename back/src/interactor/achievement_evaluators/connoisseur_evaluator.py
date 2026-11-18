from typing import Optional
from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.interactor.achievement_evaluator import (
    AchievementEvaluator,
    EvaluationContext,
    EvaluationResult
)
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.driver.database import db
from back.src.entity.ingredient import Ingredient


class ConnoisseurEvaluator(AchievementEvaluator):
    """
    Evaluator for "Connoisseur" achievement.
    Description: "Füge eine nie dagewesene Zutat hinzu"
    (Add a never-before-seen ingredient)
    
    This achievement is global. It checks if the user has created an ingredient
    with a name that has never been used before (globally, across all sessions).
    
    Note: This achievement is typically evaluated when an ingredient is created,
    not when a pan is created. The evaluate method can work with a dummy pan
    when called from ingredient creation.
    """
    
    def __init__(self):
        self.ingredient_repository = IngredientRepository()
    
    def _is_ingredient_name_new(self, ingredient_name: str, exclude_ingredient_id: Optional[int] = None) -> bool:
        """
        Check if an ingredient with this name (case-insensitive) has ever been created before.
        
        :param ingredient_name: The ingredient name to check
        :param exclude_ingredient_id: Optional ingredient ID to exclude from the check (for the newly created ingredient)
        :return: True if this is a new ingredient name, False if it exists
        """
        if not ingredient_name:
            return False
        
        # Normalize the name (lowercase, strip whitespace)
        normalized_name = ingredient_name.lower().strip()
        
        # Build query to check if any ingredient with this name exists (globally, across all sessions)
        from sqlalchemy import func
        query = db.session.query(Ingredient).filter(
            func.lower(func.trim(Ingredient.name)) == normalized_name
        )
        
        # Exclude the current ingredient if specified (for newly created ingredients)
        if exclude_ingredient_id is not None:
            query = query.filter(Ingredient.id != exclude_ingredient_id)
        
        existing_ingredient = query.first()
        
        # If no existing ingredient found, this is a new ingredient name
        return existing_ingredient is None
    
    def evaluate_for_ingredient(
        self,
        ingredient: Ingredient,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Evaluate the achievement for a newly created ingredient.
        This is called when an ingredient is created, not when a pan is created.
        
        :param ingredient: The newly created ingredient
        :param user: The user who created the ingredient
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if ingredient name is new
        """
        if not ingredient.name:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Check if this ingredient name has never been used before
        # Exclude the current ingredient from the check
        is_new = self._is_ingredient_name_new(ingredient.name, exclude_ingredient_id=ingredient.id)
        
        # Progress is binary: either 0.0 or 1.0
        progress = 1.0 if is_new else 0.0
        
        return EvaluationResult(unlocked=is_new, progress=progress)
    
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Check if the user has used an ingredient in this pan that has never been created before.
        This method is called when a pan is created, but the achievement is typically
        evaluated when an ingredient is created. This method checks if any ingredient
        in the pan is new (has a name that was never used before).
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult with unlocked=True if a new ingredient is used
        """
        if not pan.ingredients:
            return EvaluationResult(unlocked=False, progress=0.0)
        
        # Check if any ingredient in the pan has a name that has never been used before
        has_new_ingredient = False
        for ingredient in pan.ingredients:
            if ingredient.name:
                # Check if this ingredient name is new (excluding this ingredient itself)
                is_new = self._is_ingredient_name_new(ingredient.name, exclude_ingredient_id=ingredient.id)
                if is_new:
                    has_new_ingredient = True
                    break
        
        # Progress is binary: either 0.0 or 1.0
        progress = 1.0 if has_new_ingredient else 0.0
        
        return EvaluationResult(unlocked=has_new_ingredient, progress=progress)
    
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate progress - binary achievement, either unlocked or not.
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value (0.0 or 1.0)
        """
        # Check if user has already unlocked this achievement
        if achievement in user.achievements:
            return 1.0
        
        # Check if user has created any new ingredients
        # We'll check all ingredients in the session to see if the user created any new ones
        # This is a simplified check - in practice, we'd track which user created which ingredient
        # For now, we'll check if any ingredient in the session is new
        session_ingredients = self.ingredient_repository.by_session(context.session.key)
        
        for ingredient in session_ingredients:
            if ingredient.name:
                is_new = self._is_ingredient_name_new(ingredient.name, exclude_ingredient_id=ingredient.id)
                if is_new:
                    return 1.0
        
        return 0.0

