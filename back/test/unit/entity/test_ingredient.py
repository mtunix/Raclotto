from typing import Tuple

from parameterized import parameterized

from back.src.entity.ingredient import GenerationPreferences, InvalidPreferencesError
from back.test.util import DBTest


class UnitTestIngredient(DBTest):
    gen_preferences_invalid_1 = (False, False, False, False, False, False, False)  # Eats nothing (invalid)
    gen_preferences_invalid_2 = (True, False, False, False, False, False, False)  # Meat only (invalid)
    gen_preferences_invalid_3 = (False, False, False, True, False, False, False)  # Histamine only (invalid)
    gen_preferences_invalid_4 = (False, False, False, False, True, False, False)  # Fructose only (invalid)
    gen_preferences_invalid_5 = (False, False, False, False, False, True, False)  # Lactose only (invalid)
    gen_preferences_invalid_6 = (False, False, False, False, False, False, True)  # Gluten only (invalid)
    gen_preferences_invalid_7 = (False, True, False, True, True, True, True)  # Vegetarian only (invalid)

    @parameterized.expand([
        gen_preferences_invalid_1,
        gen_preferences_invalid_2,
        gen_preferences_invalid_3,
        gen_preferences_invalid_4,
        gen_preferences_invalid_5,
        gen_preferences_invalid_6,
        gen_preferences_invalid_7,
    ])
    def test_creation_invalid(
            self,
            *gen_prefs: Tuple,
    ):
        with self.assertRaises(InvalidPreferencesError):
            GenerationPreferences(*gen_prefs)
