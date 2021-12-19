import json
import unittest

from sqlalchemy import event

from back.src.model.database import Database, SQLiteMixin
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import IngredientType
from back.src.model.domain.pan import Pan
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.test.lib import get_dict_ingredient, get_json_gen_pan, get_session_const, get_dict_pan


class UnitTestPanService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        Database.engine("sqlite://")
        Base.metadata.drop_all(Database.engine())
        Base.metadata.create_all(Database.engine())
        self.p_service = PanService()
        self.i_service = IngredientService()

    def test_query_pans_empty(self):
        self.assertEqual(0, len(self.p_service.all(get_session_const().key)))

    def test_query_pans(self):
        ingredient = self.i_service.add(get_dict_ingredient())
        self.p_service.add(get_dict_pan([ingredient.id]))
        self.assertEqual(1, len(self.p_service.all(get_session_const().key)))

    def test_add_pan(self):
        ingredient = self.i_service.add(get_dict_ingredient())
        self.assertEqual(0, len(self.p_service.all(get_session_const().key)))
        self.p_service.add(get_dict_pan([ingredient.id]))
        self.assertEqual(1, len(self.p_service.all(get_session_const().key)))

    def test_remove_pan(self):
        self.assertEqual(0, len(self.p_service.all(get_session_const().key)))
        ingredient = self.i_service.add(get_dict_ingredient())
        pan = self.p_service.add(get_dict_pan([ingredient.id]))
        self.assertEqual(1, len(self.p_service.all(get_session_const().key)))
        self.p_service.remove(pan.id)
        self.assertEqual(0, len(self.p_service.all(get_session_const().key)))

    def test_generate_pan(self):
        for i in range(10):
            self.i_service.add(get_dict_ingredient(of_type=IngredientType(i % 2 + 1)))

        self.assertIsInstance(self.p_service.generate(json.loads(get_json_gen_pan())), Pan)
        self.assertEqual(4, len(self.p_service.generate(json.loads(get_json_gen_pan())).ingredients))
