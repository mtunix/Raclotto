from wonderwords import RandomWord

from back.src.driver.database import db
from back.src.driver.raclotto_api import RaclottoApi
from back.src.interactor.pan_interactor import generate


class PanApi(RaclottoApi):
    url_prefix = "pan"

    @RaclottoApi.endpoint("", ["GET"])
    def generate(self):
        """

        :return:
        """
        db.session.query()
        for key in ["vegetarian", "vegan", "histamine", "fructose", "lactose", "gluten"]:
            gen_dict[key] = gen_dict[key] == "true"
        ingredients = self.ingredient_service.select(gen_dict)
        session = self.session_service.find_by_key(gen_dict["session_key"])
        r = RandomWord()

        with self.session.begin():
            pan = Pan(
                name=f"{r.word(include_parts_of_speech=['adjectives']).capitalize()} Raclotto Pan",
                ingredients=ingredients,
                user=gen_dict["user"],
                session_id=session.id
            )
            self.session.add(pan)

        return self.find(pan.id)
        pan = generate()