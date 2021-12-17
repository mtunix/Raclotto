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


class TestApiControllerModel(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        self.api = ApiController()
        self.engine = Database.engine("sqlite://")
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def test_query_ingredients(self):
        service = DatabaseService(Ingredient)
        res_controller = self.api.get_ingredients(self._get_session_id())
        parsed = json.loads(res_controller)
        self.assertEqual(len(parsed), len(service.all(self._get_session_id())))

    def test_query_pans(self):
        service = DatabaseService(Pan)
        res_controller = self.api.get_pans(self._get_session_id())
        parsed = json.loads(res_controller)
        self.assertEqual(len(parsed), len(service.all(self._get_session_id())))

    def test_query_ratings(self):
        service = DatabaseService(Rating)
        res_controller = self.api.get_ratings(self._get_session_id())
        parsed = json.loads(res_controller)
        self.assertEqual(len(parsed), len(service.all(self._get_session_id())))

    def test_add_ingredient(self):
        service = IngredientService()
        for i in range(10):
            len_before = len(service.all(self._get_session_id()))
            self.api.add_ingredient(self._get_json_ingredient())
            self.assertEqual(len(service.all(self._get_session_id())), len_before + 1)

    def test_add_pan(self):
        pan_service = PanService()
        for i in range(10):
            self.api.add_ingredient(self._get_json_ingredient())
        len_before = len(pan_service.all(self._get_session_id()))
        self.api.add_pan(self._get_json_pan())
        self.assertEqual(len(pan_service.all(self._get_session_id())), len_before + 1)

    def test_add_rating(self):
        service = RatingService()
        for i in range(10):
            self.api.add_ingredient(self._get_json_ingredient())
        self.api.add_pan(self._get_json_pan())
        len_before = len(service.all(self._get_session_id()))
        self.api.add_rating(self._get_json_rating())
        self.assertEqual(len(service.all(self._get_session_id())), len_before + 1)

    def _get_json_ingredient(self):
        return f"""{{
            "name": "Potato",
            "session_id": "{self._get_session_id()}",
            "type": 1,
            "vegetarian": 0,
            "vegan": 0,
            "histamine": 0,
            "fructose": 0,
            "lactose": 0
        }}"""

    def _get_json_pan(self):
        return f"""{{
            "name": "PeterPan",
            "session_id": "{self._get_session_id()}",
            "ingredients": [1, 2, 5, 7]
        }}"""

    def _get_json_rating(self):
        return f"""{{
            "pan": 1,
            "rating": 3,
            "user": "mtard",
            "session_id": "{self._get_session_id()}"
        }}"""

    @staticmethod
    def _get_session_id():
        stamp = datetime(year=2021, month=1, day=1, hour=0, minute=0, second=0)
        return hashlib.sha256(str(stamp).encode("ASCII")).hexdigest()

