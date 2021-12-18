import json
import unittest

from sqlalchemy import event

from back.src.model.database import SQLiteMixin, Database
from back.src.model.domain.base import Base
from back.src.model.domain.ingredient import Ingredient, IngredientType
from back.src.model.domain.pan import Pan
from back.src.model.domain.rating import Rating
from back.src.model.service.ingredient_service import IngredientService
from back.src.model.service.pan_service import PanService
from back.test.lib import get_session_const


class TestService(SQLiteMixin, unittest.TestCase):
    def setUp(self):
        self.engine = Database.engine("sqlite://")
        event.listen(self.engine, 'connect', self._fk_pragma_on_connect)
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def test_query_ingredients_by_type_empty(self):
        service = IngredientService()
        self.assertEqual(0, len(service.all(get_session_const().key, of_type=1)))

    def test_query_ingredients_by_type(self):
        service = IngredientService()
        service.add(self._get_ingredient())
        self.assertEqual(1, len(service.all(get_session_const().key, of_type=1)))

    def test_generate_pan(self):
        p_service = PanService()
        i_service = IngredientService()
        for i in range(10):
            i_service.add(self._get_ingredient(of_type=IngredientType(i % 2 + 1)))

        self.assertIsInstance(p_service.generate(json.loads(self._get_gen_pan_json())), Pan)
        self.assertEqual(4, len(p_service.generate(json.loads(self._get_gen_pan_json())).ingredients))

    def _get_gen_pan_json(self):
        return f"""{{
            "session_key": "{get_session_const().key}",
            "user": "AldiAlfi",
            "num_fill": 2,
            "num_sauce": 2,
            "vegetarian": false,
            "vegan": false,
            "histamine": false,
            "fructose": false,
            "lactose": false,
            "gluten": false
        }}"""

    def _get_pan(self, session):
        p_dict = Pan(
            session=get_session_const(),
            ingredients=[session.query(Ingredient).first()],
            ratings=[]
        ).as_dict()
        p_dict["session_key"] = get_session_const().key
        return p_dict

    def _get_rating(self):
        r_dict = Rating(
            user="AldiAlfi",
            rating=5,
            session=get_session_const()
        ).as_dict()
        r_dict["session_key"] = get_session_const().key
        return r_dict

    def _get_ingredient(self, of_type=IngredientType.FILL):
        i_dict = Ingredient(
            name="Potato",
            session=get_session_const(),
            type=of_type,
            vegetarian=False,
            vegan=False,
            histamine=False,
            fructose=False,
            lactose=False
        ).as_dict()
        i_dict["session_key"] = get_session_const().key
        return i_dict
