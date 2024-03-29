import hashlib
from datetime import datetime

from back.src.model.domain.ingredient import IngredientType
from back.src.model.domain.raclotto_session import RaclottoSession


def get_session():
    return RaclottoSession(
        key=hashlib.sha256(str(datetime.now()).encode("ASCII")).hexdigest(),
        name="Fabulous Raclotto Session",
        timestamp=datetime.now()
    )


def get_session_const():
    stamp = datetime(year=2021, month=1, day=1, hour=0, minute=0, second=0)
    return RaclottoSession(
        key=hashlib.sha256(str(stamp).encode("ASCII")).hexdigest(),
        name="Fabulous Raclotto Session",
        timestamp=stamp
    )


def get_dict_session():
    return get_session().as_dict()


def get_dict_session_const():
    return get_session_const().as_dict()


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


def get_dict_pan(session, ingredient_ids):
    return {
        "session_id": session.id,
        "name": "Fabulous Raclotto Pan",
        "user": "AldiAlfi",
        "ingredients": ingredient_ids,
        "ratings": []
    }


def get_dict_rating(session, pan_id=1, rating=5):
    return {
        "session_id": session.id,
        "rating": rating,
        "user": "AldiAlfi",
        "pan": pan_id
    }


def get_dict_ingredient(session, of_type=IngredientType.FILL):
    return {
        "name": "Potato",
        "session_id": session.id,
        "type": of_type,
        "vegetarian": False,
        "vegan": False,
        "histamine": False,
        "fructose": False,
        "lactose": False,
        "gluten": False
    }
