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

    # def test_get_n_best_pans(self):
    #     session = self.s_service.add(get_dict_session_const())
    #     ingredient = self.i_service.add(get_dict_ingredient(session))
    #     self.assertEqual(0, len(self.p_service.all(get_session_const().key)))
    #     for _ in range(10):
    #         pan = self.p_service.add(get_dict_pan(session, [ingredient.id]))
    #         for _ in range(5):
    #             rating = get_dict_rating(session, pan.id, rating=randrange(5))
    #             self.r_service.add(rating)
    #
    #         self.assertEqual(5, len(pan.ratings))
    #         self.assertEqual(5, len(self.p_service.find(pan.id).ratings))
    #
    #     n_best = self.p_service.find_n_best()
    #     self.assertEqual(10, len(n_best))
    #     self.assertEqual(n_best, sorted(n_best, key=lambda x: x.rating))

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
