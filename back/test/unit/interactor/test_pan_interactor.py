import json
from random import randrange

from parameterized import parameterized

from back.src.entity import Pan
from back.src.entity.ingredient import GenerationParameters
from back.src.interactor.pan_interactor import PanInteractor
from back.test.unit.interactor.generation_objects import gen_params_1, gen_params_6
from back.test.util import DBTest


class UnitTestPanService(DBTest):
    def setUp(self):
        super().setUp()
        self.pan_interactor = PanInteractor()

    @parameterized.expand([
        (7, None, None),
    ])
    def test_get_n_best_pans(
            self,
            expected_num: int,
            session_key: str,
            n: int
    ):
        n_best = self.pan_interactor.find_n_best(session_key, n)
        self.assertEqual(expected_num, len(n_best))
        self.assertEqual(n_best, sorted(n_best, key=lambda x: x.rating))

    @parameterized.expand([
        (gen_params_1, 11),
        (gen_params_6, 6)
    ])
    def test_generate_pan(
            self,
            params: GenerationParameters,
            expected_ingredients: int
    ):
        pan = self.pan_interactor.generate(params)
        self.assertIs(Pan, type(pan))
        self.assertEqual(expected_ingredients, len(pan.ingredients))
