from back.src.entity.ingredient import GenerationPreferences, GenerationParameters
from back.test.util import session_id

gen_preferences_1 = GenerationPreferences(True, True, True, True, True, True, True)  # Eats everything
gen_preferences_2 = GenerationPreferences(False, True, True, True, True, True, True)  # Vegetarian
gen_preferences_3 = GenerationPreferences(False, False, True, True, True, True, True)  # Vegan
gen_preferences_4 = GenerationPreferences(True, True, True, True, True, True, False)  # Gluten free
gen_preferences_5 = GenerationPreferences(True, True, True, True, True, False, True)  # Lactose free
gen_preferences_6 = GenerationPreferences(False, True, True, False, True, True, True)  # Vegetarian, no histamine
gen_params_1 = GenerationParameters(session_id, 1, 7, 4, gen_preferences_1)  # Give all
gen_params_2 = GenerationParameters(session_id, 1, 3, 3, gen_preferences_2)
gen_params_3 = GenerationParameters(session_id, 1, 3, 1, gen_preferences_3)
gen_params_4 = GenerationParameters(session_id, 1, 7, 4, gen_preferences_4)
gen_params_5 = GenerationParameters(session_id, 1, 7, 4, gen_preferences_5)
gen_params_6 = GenerationParameters(session_id, 1, 3, 3, gen_preferences_6)
gen_params_no_session = GenerationParameters("does_not_exist", 1, 1, 1, gen_preferences_1)
