from back.src.model.domain.ingredient import Ingredient


class Fill(Ingredient):
    __tablename__ = "fill"

    def __init__(self, name, vegetarian, vegan, histamine, fructose, lactose):
        super().__init__(name, vegetarian, vegan, histamine, fructose, lactose)

