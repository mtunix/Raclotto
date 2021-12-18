import hashlib
from datetime import datetime

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


def get_dict_pan(session):
    p_dict = Pan(
        session=get_session_const(),
        ingredients=[session.query(Ingredient).first()],
        ratings=[]
    ).as_dict()
    p_dict["session_key"] = get_session_const().key
    return p_dict


def get_dict_rating():
    r_dict = Rating(
        user="AldiAlfi",
        rating=5,
        session=get_session_const()
    ).as_dict()
    r_dict["session_key"] = get_session_const().key
    return r_dict


def get_dict_ingredient(of_type=IngredientType.FILL):
    i_dict = Ingredient(
        name="Potato",
        session=get_session_const(),
        type=of_type,
        vegetarian=False,
        vegan=False,
        histamine=False,
        fructose=False,
        lactose=False
    ).as_dict()
    i_dict["session_key"] = get_session_const().key
    return i_dict
