import json

from back.src.interactor import AchievementService
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository
from back.src.repository.session_repository import SessionRepository
from back.src.entity.ingredient import IngredientType, GenerationParameters
from back.src.view.api_view import ApiView


class ApiController:
    def __init__(self):
        self.view = ApiView()
        self.ingredient_repository = IngredientRepository()
        self.pan_repository = PanRepository()
        self.rating_repository = RatingRepository()
        self.session_repository = SessionRepository()
        self.achievement_service = AchievementService()

    def get_ingredients(self, session_id, of_type=None):
        if of_type:
            ingredient_type = IngredientType(int(of_type))
            items = self.ingredient_repository.by_type(session_id, ingredient_type)
        else:
            items = self.ingredient_repository.by_session(session_id)
        return self.view.get(items)

    def get_pans(self, session_id):
        items = self.pan_repository.by_session(session_id)
        return self.view.get(items)

    def get_ratings(self, session_id):
        items = self.rating_repository.by_session(session_id)
        return self.view.get(items)

    def get_session(self, session_key):
        session = self.session_repository.by_key(session_key)
        return self.view.scalar("session", session)

    def get_sessions(self):
        sessions = self.session_repository.active_sessions()
        return self.view.get(sessions)

    def add_ingredient(self, parsed):
        # Convert type to IngredientType if provided
        if 'type' in parsed:
            parsed['type'] = IngredientType(int(parsed['type']))
        
        # Get session
        session = self.session_repository.by_key(parsed.get('session_key'))
        if not session:
            raise ValueError(f"Session not found: {parsed.get('session_key')}")
        
        # Remove session_key and add session relationship
        parsed.pop('session_key', None)
        parsed['session'] = session
        
        ingredient = self.ingredient_repository.create(parsed)
        return self.view.scalar("added", ingredient)

    def add_pan(self, json_str):
        parsed = json.loads(json_str)
        # This method needs ingredients and session handling
        # For now, just create a basic pan - may need more work
        ingredients = []
        if 'ingredients' in parsed:
            for ing_id in parsed['ingredients']:
                ingredient = self.ingredient_repository.by_id(ing_id)
                if ingredient:
                    ingredients.append(ingredient)
        
        session = self.session_repository.by_key(parsed.get('session_key'))
        if not session:
            raise ValueError(f"Session not found: {parsed.get('session_key')}")
        
        pan_data = {
            'name': parsed.get('name', 'Pan'),
            'ingredients': ingredients,
            'user_id': parsed.get('user_id'),
            'session_id': session.id
        }
        self.pan_repository.create(pan_data)

    def add_rating(self, parsed):
        session = self.session_repository.by_key(parsed.get('session_key'))
        if not session:
            raise ValueError(f"Session not found: {parsed.get('session_key')}")
        
        pan_id = parsed.get('pan')
        rating_data = {k: v for k, v in parsed.items() if k not in ['session_key', 'pan']}
        rating = self.rating_repository.create_for_pan(rating_data, pan_id, session.id)
        return self.view.scalar("added", rating)

    def add_session(self, obj_dict):
        sesh = self.session_repository.create_with_key(obj_dict['name'], obj_dict.get('user_id'))
        return self.view.scalar("session", sesh)

    def del_ingredient(self, parsed):
        ingredient = self.ingredient_repository.mark_unavailable(parsed['id'])
        return self.view.scalar("ingredient", ingredient)

    def gen_pan(self, json_str):
        parsed = json.loads(json_str)
        # Convert to GenerationParameters
        from back.src.entity.ingredient import GenerationPreferences
        preferences = GenerationPreferences(
            meat=parsed.get('meat', True),
            vegetarian=parsed.get('vegetarian', True),
            vegan=parsed.get('vegan', True),
            histamine=parsed.get('histamine', True),
            fructose=parsed.get('fructose', True),
            lactose=parsed.get('lactose', True),
            gluten=parsed.get('gluten', True)
        )
        gen_params = GenerationParameters(
            session_key=parsed['session_key'],
            user=parsed['user'],
            num_fill=parsed.get('num_fill', 3),
            num_sauce=parsed.get('num_sauce', 1),
            preferences=preferences
        )
        
        # Select random ingredients
        ingredients = self.ingredient_repository.select_random(gen_params)
        
        # Get session
        session = self.session_repository.by_key(gen_params.session_key)
        if not session:
            raise ValueError(f"Session not found: {gen_params.session_key}")
        
        # Generate pan
        pan = self.pan_repository.generate(ingredients, session.id, gen_params.user, None)
        return self.view.get(pan)

    def validate(self, session_key):
        validation = self.session_repository.validate(session_key)
        return self.view.scalar(session_key, validation)

    def generate(self, gen_dict):
        # Convert to GenerationParameters
        from back.src.entity.ingredient import GenerationPreferences
        preferences = GenerationPreferences(
            meat=gen_dict.get('meat', True),
            vegetarian=gen_dict.get('vegetarian', True),
            vegan=gen_dict.get('vegan', True),
            histamine=gen_dict.get('histamine', True),
            fructose=gen_dict.get('fructose', True),
            lactose=gen_dict.get('lactose', True),
            gluten=gen_dict.get('gluten', True)
        )
        gen_params = GenerationParameters(
            session_key=gen_dict['session_key'],
            user=gen_dict['user'],
            num_fill=gen_dict.get('num_fill', 3),
            num_sauce=gen_dict.get('num_sauce', 1),
            preferences=preferences
        )
        
        # Select random ingredients
        ingredients = self.ingredient_repository.select_random(gen_params)
        
        # Get session
        session = self.session_repository.by_key(gen_params.session_key)
        if not session:
            raise ValueError(f"Session not found: {gen_params.session_key}")
        
        # Generate pan
        pan = self.pan_repository.generate(ingredients, session.id, gen_params.user, None)
        return self.view.scalar("generated", pan)

    def get_achievements(self):
        from back.src.repository.achievement_repository import AchievementRepository
        achievement_repository = AchievementRepository()
        achievements = achievement_repository.all()
        return self.view.get(achievements)

    def close_session(self, parsed):
        session = self.session_repository.close_session(parsed['session_key'])
        return self.view.scalar("session", session)

    def ref_ingredient(self, parsed):
        ingredient = self.ingredient_repository.mark_available(parsed['id'])
        return self.view.scalar("ingredient", ingredient)
