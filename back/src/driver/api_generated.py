from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.achievement import Achievement
from back.src.entity.ingredient import Ingredient
from back.src.entity.insults import Insult
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating

"""
Every entity should be in this list.
Entities that don't have rest api endpoints have empty list of methods.
Entities that don't have preprocessors or postprocessors have empty dicts.
"""

apis_generated = [
    # (entity, methods, preprocessors, postprocessors)
    (RaclottoSession, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Ingredient, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Achievement, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Pan, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Rating, ["GET", "POST", "DELETE", "PATCH"], {}, {}),
    (Insult, ["GET", "POST", "DELETE", "PATCH"], {}, {})
]
