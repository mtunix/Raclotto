from back.src.model.domain.achievement import Achievement
from back.src.model.domain.ingredient import Ingredient
from back.src.model.domain.insults import Insult
from back.src.model.domain.pan import Pan
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.domain.rating import Rating

"""
Every entity should be in this list.
Entities that don't have rest api endpoints have empty list of methods.
Entities that don't have preprocessors or postprocessors have empty dicts.
"""

apis_generated = [
    # (entity, methods, preprocessors, postprocessors)
    (Ingredient, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Achievement, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Pan, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Rating, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (RaclottoSession, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Insult, ["GET", "POST", "DELETE", "PATCH"], {}, {})
]