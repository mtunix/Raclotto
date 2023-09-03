from back.src.driver.raclotto_api import RaclottoApi
from back.src.entity.pan import Pan


@RaclottoApi.endpoint("")
def generate() -> Pan:
    pass