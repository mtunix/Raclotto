from back.src.api.achievement_api import AchievementApi
from back.src.api.event_api import EventApi
from back.src.api.image_api import ImageApi
from back.src.api.ingredient_api import IngredientApi
from back.src.api.insult_api import InsultApi
from back.src.api.level_api import LevelApi
from back.src.api.pan_api import PanApi
from back.src.api.preparation_type_api import PreparationTypeApi
from back.src.api.rating_api import RatingApi
from back.src.api.session_api import SessionApi
from back.src.api.stats_api import StatsApi
from back.src.api.user_api import UserApi
from back.src.driver.auth_api import AuthApi, InviteApi

apis_custom = [
    PanApi,
    SessionApi,
    IngredientApi,
    RatingApi,
    AchievementApi,
    InsultApi,
    PreparationTypeApi,
    StatsApi,
    EventApi,
    UserApi,
    LevelApi,
    ImageApi,
    AuthApi,
    InviteApi,
]
