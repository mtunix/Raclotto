import hashlib
from datetime import datetime

from back.src.model.database import Database
from back.src.model.domain.ingredient import Ingredient, IngredientType
from back.src.model.domain.pan import Pan
from back.src.model.domain.raclotto_session import RaclottoSession
from back.src.model.domain.rating import Rating


def get_session():
    return RaclottoSession(
        key=hashlib.sha256(str(datetime.now()).encode("ASCII")).hexdigest()
    )


def get_session_const():
    stamp = datetime(year=2021, month=1, day=1, hour=0, minute=0, second=0)
    return RaclottoSession(
        key=hashlib.sha256(str(stamp).encode("ASCII")).hexdigest()
    )


def get_json_gen_pan():
    return f"""{{
        "session_key": "{get_session_const().key}",
        "user": "AldiAlfi",
        "num_fill": 2,
        "num_sauce": 2,
        "vegetarian": false,
        "vegan": false,
        "histamine": false,
        "fructose": false,
        "lactose": false,
        "gluten": false
    }}"""


def get_json_ingredient():
    return f"""{{
        "name": "Potato",
        "session_key": "{get_session_const().key}",
        "type": 1,
        "vegetarian": 0,
        "vegan": 0,
        "histamine": 0,
        "fructose": 0,
        "lactose": 0,
        "gluten": 0
    }}"""


def get_json_pan():
    return f"""{{
        "name": "PeterPan",
        "user": "AldiAlfi",
        "session_key": "{get_session_const().key}",
        "ingredients": [1, 2, 5, 7]
    }}"""


def get_json_rating():
    return f"""{{
        "pan": 1,
        "rating": 3,
        "user": "mtard",
        "session_key": "{get_session_const().key}"
    }}"""


def get_dict_pan(ingredient_ids):
    return {
        "session_key": get_session_const().key,
        "name": "Fabulous Raclotto Pan",
        "user": "AldiAlfi",
        "ingredients": ingredient_ids,
        "ratings": []
    }


def get_dict_rating(pan_id=1):
    return {
        "session_key": get_session_const().key,
        "rating": 5,
        "user": "AldiAlfi",
        "pan": pan_id
    }


def get_dict_ingredient(of_type=IngredientType.FILL):
    return {
        "name": "Potato",
        "session_key": get_session_const().key,
        "type": of_type,
        "vegetarian": False,
        "vegan": False,
        "histamine": False,
        "fructose": False,
        "lactose": False,
        "gluten": False
    }
