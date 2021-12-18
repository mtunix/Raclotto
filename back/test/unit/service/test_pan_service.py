import json
import unittest

from sqlalchemy import event

from back.src.model.database import Database, SQLiteMixin
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import IngredientType
from back.src.model.domain.pan import Pan
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.test.lib import get_dict_ingredient, get_json_gen_pan


class UnitTestPanService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        Database.engine("sqlite://")
        Base.metadata.drop_all(Database.engine())
        Base.metadata.create_all(Database.engine())

    def test_generate_pan(self):
        p_service = PanService()
        i_service = IngredientService()
        for i in range(10):
            i_service.add(get_dict_ingredient(of_type=IngredientType(i % 2 + 1)))

        self.assertIsInstance(p_service.generate(json.loads(get_json_gen_pan())), Pan)
        self.assertEqual(4, len(p_service.generate(json.loads(get_json_gen_pan())).ingredients))
