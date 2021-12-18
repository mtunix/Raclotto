import hashlib
import json
import unittest
from datetime import datetime

from back.src.controller.api_controller import ApiController
from back.src.model.database import SQLiteMixin, Database
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import Ingredient
from back.src.model.domain.pan import Pan
from back.src.model.domain.rating import Rating
from back.src.model.service.database_service import DatabaseService
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.src.model.service.rating_service import RatingService
from back.test.lib import get_session_const, get_json_rating, get_json_pan, get_json_ingredient


class TestApiControllerModel(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        self.api = ApiController()
        Database.engine("sqlite://")
        Base.metadata.drop_all(Database.engine())
        Base.metadata.create_all(Database.engine())

    def test_query_ingredients(self):
        service = DatabaseService(Ingredient)
        res_controller = self.api.get_ingredients(get_session_const().key)
        parsed = json.loads(res_controller)
        self.assertEqual(len(parsed), len(service.all(get_session_const().key)))

    def test_query_pans(self):
        service = DatabaseService(Pan)
        res_controller = self.api.get_pans(get_session_const().key)
        parsed = json.loads(res_controller)
        self.assertEqual(len(parsed), len(service.all(get_session_const().key)))

    def test_query_ratings(self):
        service = DatabaseService(Rating)
        res_controller = self.api.get_ratings(get_session_const().key)
        parsed = json.loads(res_controller)
        self.assertEqual(len(parsed), len(service.all(get_session_const().key)))

    def test_add_ingredient(self):
        service = IngredientService()
        for i in range(10):
            len_before = len(service.all(get_session_const().key))
            self.api.add_ingredient(get_json_ingredient())
            self.assertEqual(len(service.all(get_session_const().key)), len_before + 1)

    def test_add_pan(self):
        pan_service = PanService()
        for i in range(10):
            self.api.add_ingredient(get_json_ingredient())
        len_before = len(pan_service.all(get_session_const().key))
        self.api.add_pan(get_json_pan())
        self.assertEqual(len(pan_service.all(get_session_const().key)), len_before + 1)

    def test_add_rating(self):
        service = RatingService()
        for i in range(10):
            self.api.add_ingredient(get_json_ingredient())
        self.api.add_pan(get_json_pan())
        len_before = len(service.all(get_session_const().key))
        self.api.add_rating(get_json_rating())
        self.assertEqual(len(service.all(get_session_const().key)), len_before + 1)
