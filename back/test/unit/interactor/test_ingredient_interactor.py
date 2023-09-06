from parameterized import parameterized

from back.src.entity.ingredient import IngredientType, GenerationPreferences, GenerationParameters, Ingredient
from back.src.interactor.ingredient_interactor import IngredientInteractor
from back.src.interactor.session_service import SessionService
from back.test.util import DBTest, session_id

gen_preferences_1 = GenerationPreferences(True, True, True, True, True, True, True)  # Eats everything
gen_preferences_2 = GenerationPreferences(False, True, True, True, True, True, True)  # Vegetarian
gen_preferences_3 = GenerationPreferences(False, False, True, True, True, True, True)  # Vegan
gen_preferences_4 = GenerationPreferences(True, True, True, True, True, True, False)  # Gluten free
gen_preferences_5 = GenerationPreferences(True, True, True, True, True, False, False)  # Lactose free
gen_params_1 = GenerationParameters(session_id, 1, 7, 4, gen_preferences_1)  # Give all
gen_params_2 = GenerationParameters(session_id, 1, 3, 3, gen_preferences_2)
gen_params_3 = GenerationParameters(session_id, 1, 1, 1, gen_preferences_3)
gen_params_4 = GenerationParameters(session_id, 1, 1, 1, gen_preferences_4)
gen_params_5 = GenerationParameters(session_id, 1, 1, 1, gen_preferences_5)
gen_params_no_session = GenerationParameters("does_not_exist", 1, 1, 1, gen_preferences_1)


class UnitTestIngredientInteractor(DBTest):
    def setUp(self):
        super().setUp()
        self.ingredient_interactor = IngredientInteractor()
        self.session_service = SessionService()

    def test_all_filtered_no_session(self):
        result = self.ingredient_interactor.all_filtered(gen_params_no_session, IngredientType.FILL)
        self.assertEqual(result, [])

    @parameterized.expand([
        (gen_params_1, IngredientType.FILL, 7),  # omnivore
        (gen_params_2, IngredientType.FILL, 4),  # vegetarian
        (gen_params_3, IngredientType.FILL, 3),  # vegan
        (gen_params_4, IngredientType.FILL, 6),  # gluten free
        (gen_params_5, IngredientType.FILL, 6),  # lactose free
    ])
    def test_all_filtered_valid(
            self,
            gen_params: GenerationParameters,
            of_type: IngredientType,
            expected_num: int
    ):
        result = self.ingredient_interactor.all_filtered(gen_params, of_type)
        self.assertEqual(len(result), expected_num)

    @parameterized.expand([
        (gen_params_1, 7, 4, 11),
        (gen_params_2, 3, 3, 6),
        (gen_params_3, 1, 1, 1),
        (gen_params_4, 1, 1, 1),
        (gen_params_5, 1, 1, 1)
    ])
    def test_select(
            self,
            gen_params: GenerationParameters,
            expected_fill: int,
            expected_sauce: int,
            expected_sum: int
    ):
        result = self.ingredient_interactor.select(gen_params)
        fills = [x for x in result if x.type == IngredientType.FILL]
        sauces = [x for x in result if x.type == IngredientType.SAUCE]
        self.assertEqual(len(fills), expected_fill)
        self.assertEqual(len(sauces), expected_sauce)
        self.assertEqual(len(result), expected_sum)
