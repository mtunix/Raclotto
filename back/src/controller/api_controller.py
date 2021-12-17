import json

from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.src.model.service.rating_service import RatingService
from back.src.view.api_view import ApiView


class ApiController:
    def __init__(self):
        self.view = ApiView()
        self.ingredient_service = IngredientService()
        self.pan_service = PanService()
        self.rating_service = RatingService()

    def get_ingredients(self, session_id):
        items = self.ingredient_service.all(session_id)
        return self.view.get(items)

    def get_pans(self, session_id):
        items = self.pan_service.all(session_id)
        return self.view.get(items)

    def get_ratings(self, session_id):
        items = self.rating_service.all(session_id)
        return self.view.get(items)

    def add_ingredient(self, json_str):
        parsed = json.loads(json_str)
        self.ingredient_service.add(parsed)

    def add_pan(self, json_str):
        parsed = json.loads(json_str)
        self.pan_service.add(parsed)

    def add_rating(self, json_str):
        parsed = json.loads(json_str)
        self.rating_service.add(parsed)
