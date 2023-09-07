from back.src.driver.raclotto_api import RaclottoApi
from back.src.interactor.pan_interactor import PanInteractor, GenerationParameters


class PanApi(RaclottoApi):
    url_prefix = "/pan"

    def __init__(self):
        super().__init__()
        self.pan_interactor = PanInteractor()

    @RaclottoApi.endpoint("/generate", ["GET"])
    def generate(self):
        """Endpoint to generate a new Raclotto pan

        Used to generate a new Raclotto pan according to the given generation parameters.
        The parameters are passed in the request body.
        See GenerationParameters for available keys in the generation object.

        :returns Pan: Generated pan according to the given generation parameters
        :status_code 200: Pan generated successfully
        """
        return {
            "data": self.pan_interactor.generate(GenerationParameters())
        }
