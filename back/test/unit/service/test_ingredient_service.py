import unittest

from sqlalchemy import event

from back.src.model.database import SQLiteMixin, Database
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import IngredientType
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.test.lib import get_session_const, get_dict_ingredient, get_dict_pan


class UnitTestIngredientService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        Database.engine("sqlite://")
        Base.metadata.drop_all(Database.engine())
        Base.metadata.create_all(Database.engine())
        self.i_service = IngredientService()
        self.p_service = PanService()

    def test_query_ingredients_empty(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key)))

    def test_query_ingredients(self):
        self.i_service.add(get_dict_ingredient())
        self.i_service.add(get_dict_ingredient(of_type=IngredientType.SAUCE))
        self.assertEqual(2, len(self.i_service.all(get_session_const().key)))

    def test_query_ingredients_by_type_empty(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_query_ingredients_by_type(self):
        self.i_service.add(get_dict_ingredient())
        self.i_service.add(get_dict_ingredient(of_type=IngredientType.SAUCE))
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_add_ingredient(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.i_service.add(get_dict_ingredient())
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_remove_ingredient(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))
        ingredient = self.i_service.add(get_dict_ingredient())
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.i_service.delete(ingredient.session.key, ingredient.id)
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_remove_used_ingredient(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))
        ingredient = self.i_service.add(get_dict_ingredient())
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.p_service.add(get_dict_pan([ingredient.id]))
        self.i_service.delete(ingredient.session.key, ingredient.id)
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.assertFalse(self.i_service.find(ingredient.id).available)

