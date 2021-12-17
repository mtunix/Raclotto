from back.src.model.ingredient import Ingredient


class Sauce(Ingredient):
    def __init__(self, name, vegetarian, vegan, histamine, fructose, lactose):
        super().__init__(name, vegetarian, vegan, histamine, fructose, lactose)