from back.src.driver.raclotto_api import RaclottoApi
from back.src.interactor.pan_interactor import PanInteractor


class PanApi(RaclottoApi):
    url_prefix = "pan"

    def __init__(self):
        super().__init__()
        self.pan_interactor = PanInteractor()

    @RaclottoApi.endpoint("", ["GET"])
    def generate(self):
        """

        :return:
        """
        return self.pan_interactor.generate({})