import json
from random import randrange

from back.src.interactor.pan_interactor import PanInteractor
from back.test.util import DBTest


class UnitTestPanService(DBTest):
    def setUp(self):
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

    def test_generate_pan(self):
        session = self.s_service.add(get_dict_session_const())
        for i in range(10):
            self.i_service.add(get_dict_ingredient(session, of_type=IngredientType(i % 2 + 1)))

        self.assertIsInstance(self.p_service.generate(json.loads(get_json_gen_pan())), Pan)
        self.assertEqual(4, len(self.p_service.generate(json.loads(get_json_gen_pan())).ingredients))
