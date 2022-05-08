import unittest

from sqlalchemy import event

from back.src.model.database import SQLiteMixin, Database
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import IngredientType
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.src.model.service.session_service import SessionService
from back.test.lib import get_session_const, get_dict_ingredient, get_dict_pan, get_dict_session_const


class UnitTestIngredientService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        Database.engine("sqlite://")
        Base.metadata.drop_all(Database.engine())
        Base.metadata.create_all(Database.engine())
        self.i_service = IngredientService()
        self.p_service = PanService()
        self.s_service = SessionService()

    def test_query_ingredients_empty(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key)))

    def test_query_ingredients(self):
        session = self.s_service.add(get_dict_session_const())
        self.i_service.add(get_dict_ingredient(session))
        self.i_service.add(get_dict_ingredient(session, of_type=IngredientType.SAUCE))
        self.assertEqual(2, len(self.i_service.all(get_session_const().key)))

    def test_query_ingredients_by_type_empty(self):
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_query_ingredients_by_type(self):
        session = self.s_service.add(get_dict_session_const())
        self.i_service.add(get_dict_ingredient(session))
        self.i_service.add(get_dict_ingredient(session, of_type=IngredientType.SAUCE))
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_add_ingredient(self):
        session = self.s_service.add(get_dict_session_const())
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.i_service.add(get_dict_ingredient(session))
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_remove_ingredient(self):
        session = self.s_service.add(get_dict_session_const())
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))
        ingredient = self.i_service.add(get_dict_ingredient(session))
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.i_service.delete(ingredient.session.key, ingredient.id)
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))

    def test_remove_used_ingredient(self):
        session = self.s_service.add(get_dict_session_const())
        self.assertEqual(0, len(self.i_service.all(get_session_const().key, of_type=1)))
        ingredient = self.i_service.add(get_dict_ingredient(session))
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.p_service.add(get_dict_pan(session, [ingredient.id]))
        self.i_service.delete(ingredient.session.key, ingredient.id)
        self.assertEqual(1, len(self.i_service.all(get_session_const().key, of_type=1)))
        self.assertFalse(self.i_service.find(ingredient.id).available)

