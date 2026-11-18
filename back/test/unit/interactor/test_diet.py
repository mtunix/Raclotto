import unittest
from types import SimpleNamespace

from parameterized import parameterized

from back.src.interactor.diet import Diet


def ingredient(category: str, **contains) -> SimpleNamespace:
    flags = dict.fromkeys(
        ("meat", "vegetarian", "vegan", "fish", "histamine", "fructose", "lactose", "gluten"),
        False,
    )
    flags[category] = True
    flags.update(contains)
    return SimpleNamespace(**flags)


OMNIVORE = Diet(meat=True)
VEGETARIAN = Diet(meat=False, vegetarian=True)
VEGAN = Diet(meat=False, vegetarian=False, vegan=True)


class TestNormalization(unittest.TestCase):
    @parameterized.expand(
        [
            # (meat, vegetarian, vegan) -> normalized (meat, vegetarian, vegan)
            ((True, False, False), (True, True, True)),
            ((False, True, False), (False, True, True)),
            ((False, False, True), (False, False, True)),
            ((False, False, False), (False, True, True)),
            ((True, True, True), (True, True, True)),
        ]
    )
    def test_hierarchy(self, given, expected):
        meat, vegetarian, vegan = given
        diet = Diet(meat=meat, vegetarian=vegetarian, vegan=vegan).normalized()
        self.assertEqual((diet.meat, diet.vegetarian, diet.vegan), expected)

    def test_fish_is_independent_of_the_hierarchy(self):
        self.assertFalse(Diet(meat=True, fish=False).normalized().fish)
        self.assertTrue(Diet(meat=False, vegetarian=True, fish=True).normalized().fish)

    def test_of_reads_and_normalizes_a_user_row(self):
        row = SimpleNamespace(
            meat=False, vegetarian=False, vegan=False, fish=False,
            histamine=True, fructose=True, lactose=False, gluten=True,
        )
        diet = Diet.of(row)
        self.assertEqual((diet.vegetarian, diet.vegan, diet.lactose), (True, True, False))

    def test_apply_to_writes_normalized_flags(self):
        row = SimpleNamespace()
        Diet(meat=True, vegetarian=False, vegan=False).apply_to(row)
        self.assertEqual((row.meat, row.vegetarian, row.vegan), (True, True, True))


class TestAllows(unittest.TestCase):
    @parameterized.expand(
        [
            ("omnivore eats meat", OMNIVORE, ingredient("meat"), True),
            ("omnivore without fish skips fish", OMNIVORE, ingredient("fish"), False),
            ("omnivore with fish eats fish", Diet(meat=True, fish=True), ingredient("fish"), True),
            ("vegetarian skips meat", VEGETARIAN, ingredient("meat"), False),
            ("vegetarian eats vegan", VEGETARIAN, ingredient("vegan"), True),
            ("pescetarian eats fish", Diet(meat=False, vegetarian=True, fish=True), ingredient("fish"), True),
            ("vegan skips vegetarian", VEGAN, ingredient("vegetarian"), False),
            ("vegan eats vegan", VEGAN, ingredient("vegan"), True),
            ("lactose intolerant skips lactose", Diet(lactose=False), ingredient("vegan", lactose=True), False),
            ("gluten tolerant eats gluten", Diet(), ingredient("vegan", gluten=True), True),
        ]
    )
    def test_allows(self, _name, diet, item, expected):
        self.assertEqual(diet.allows(item), expected)


if __name__ == "__main__":
    unittest.main()
