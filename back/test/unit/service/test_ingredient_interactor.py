from parameterized import parameterized

from back.src.entity.ingredient import IngredientType, GenerationPreferences, GenerationParameters, Ingredient
from back.src.interactor.ingredient_interactor import IngredientInteractor
from back.src.interactor.session_service import SessionService
from back.test.util import DBTest, session_id

gen_preferences_1 = GenerationPreferences(True, True, True, True, True, True, True)  # Eats everything
gen_params_1 = GenerationParameters(session_id, 1, 1, 1, gen_preferences_1)

gen_params_no_session = GenerationParameters("does_not_exist", 1, 1, 1, gen_preferences_1)


class UnitTestIngredientInteractor(DBTest):
    def setUp(self):
        super().setUp()
        self.ingredient_interactor = IngredientInteractor()
        self.session_service = SessionService()

    # def test_select(self):
    #     pass

    def test_all_filtered_no_session(self):
        result = self.ingredient_interactor.all_filtered(gen_params_no_session, IngredientType.FILL)
        self.assertEqual(result, [])

    @parameterized.expand([
        (gen_params_1, IngredientType.FILL)
    ])
    def test_all_filtered(self, gen_params: GenerationParameters, of_type: IngredientType):
        session = self.session_service.find_by_key(gen_params.session_key)
        result = self.ingredient_interactor.all_filtered(gen_params, of_type)
        all = self.session.query(Ingredient).filter(Ingredient.session_id == session.id, Ingredient.type == of_type).all()
        print(result)
        self.assertEqual(len(result), len(all))

