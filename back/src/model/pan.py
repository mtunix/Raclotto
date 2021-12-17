class Pan:
    def __init__(self, fills, sauces, ratings=None):
        if ratings is None:
            ratings = []

        self.fills = fills
        self.sauces = sauces
        self.ratings = ratings
