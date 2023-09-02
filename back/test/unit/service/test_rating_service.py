import unittest

from back.src.model.database import Database, SQLiteMixin
from back.src.entity.base import Base
from back.src.interactor import IngredientService
from back.src.interactor import PanService
from back.src.interactor import RatingService
from back.test.lib import get_dict_ingredient, get_session_const, get_dict_pan, get_dict_rating


class UnitTestRatingService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        Database.engine("sqlite://")
        Base.metadata.drop_all(Database.engine())
        Base.metadata.create_all(Database.engine())
        self.p_service = PanService()
        self.i_service = IngredientService()
        self.r_service = RatingService()

    def test_query_ratings_empty(self):
        self.assertEqual(0, len(self.r_service.all(get_session_const().key)))

    def test_add_ratings(self):
        ingredient = self.i_service.add(get_dict_ingredient())
        pan = self.p_service.add(get_dict_pan([ingredient.id]))
        self.r_service.add(get_dict_rating())
        self.assertEqual(1, len(self.r_service.all(get_session_const().key)))
        self.assertEqual(1, len(self.p_service.find(pan.id).ratings))

