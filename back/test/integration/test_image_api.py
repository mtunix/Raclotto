from pydantic import TypeAdapter

from back.src.dto.profile_picture import GeneratedPictureDto, ProfilePictureDto
from back.src.interactor.profile_pictures import GeminiImageGenerator, set_image_generator
from back.src.repository.level_repository import LevelRepository
from back.test.integration.test_profile_pictures import (
    IMAGE,
    FakeImageGenerator,
    RaisingImageGenerator,
    add_picture,
)
from back.test.support import AppTest


class ImageApiTest(AppTest):
    def setUp(self):
        super().setUp()
        self.fake = FakeImageGenerator()
        self.previous = set_image_generator(self.fake)
        self.levels = LevelRepository().all_ordered()
        self.ana = self.make_user("ana", experience_points=self.levels[1].required_experience)
        self.ben = self.make_user("ben")

    def tearDown(self):
        set_image_generator(self.previous)
        super().tearDown()

    def history(self, user) -> list[ProfilePictureDto]:
        response = self.call("GET", f"/images/profile-picture-history/{user.id}", self.ben)
        self.assertEqual(response.status_code, 200, response.json)
        return TypeAdapter(list[ProfilePictureDto]).validate_python(response.json)

    def without_api_key(self):
        set_image_generator(GeminiImageGenerator(api_key=None))

    def assert_error(self, response, status: int, code: str, title: str | None = None):
        self.assertEqual(response.status_code, status, response.json)
        [error] = response.json["errors"]
        self.assertEqual(error["code"], code)
        if title is not None:
            self.assertEqual(error["title"], title)

    def test_history_is_newest_first_with_its_levels(self):
        old = add_picture(self.ana, "/static/old.png", 10, level_id=self.levels[0].id)
        removed = add_picture(self.ana, None, 5)
        new = add_picture(self.ana, "data:image/png;base64,abc", 1, candidate=True, level_id=self.levels[1].id)
        add_picture(self.ben, "/static/ben.png", 1)

        response = self.call("GET", f"/images/profile-picture-history/{self.ana.id}", self.ben)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([e["id"] for e in response.json], [new.id, removed.id, old.id])
        self.assertEqual(
            response.json[0],
            {
                "id": new.id,
                "profile_picture": "data:image/png;base64,abc",
                "level_id": self.levels[1].id,
                "level": {
                    "id": self.levels[1].id,
                    "name": self.levels[1].name,
                    "label_en": self.levels[1].label_en,
                    "label_de": self.levels[1].label_de,
                    "required_experience": self.levels[1].required_experience,
                },
                "created_at": new.created_at.isoformat(),
                "is_candidate": True,
            },
        )
        self.assertEqual((response.json[1]["profile_picture"], response.json[1]["level"]), (None, None))

    def test_history_of_an_unknown_user_is_404(self):
        self.assertEqual(self.call("GET", "/images/profile-picture-history/999", self.ana).status_code, 404)
        self.assertEqual(self.call("GET", f"/images/profile-picture-history/{self.ana.id}").status_code, 401)

    def test_a_generated_profile_picture_as_json(self):
        level = self.levels[2]

        response = self.call("POST", "/images/generate-profile-picture", self.ana, body={"level_id": level.id})

        self.assertEqual(response.status_code, 200, response.json)
        newest = self.history(self.ana)[0]
        self.assertEqual(newest.profile_picture, f"data:image/png;base64,{IMAGE}")
        self.assertEqual(
            GeneratedPictureDto.model_validate(response.json),
            GeneratedPictureDto(
                id=newest.id,
                image_base64=IMAGE,
                mime_type="image/png",
                level_id=level.id,
                created_at=newest.created_at,
            ),
        )

    def test_a_failed_profile_picture_is_500(self):
        for generator, body in (
            (FakeImageGenerator(image=None), {}),
            # The level comes from the client; an unknown one fails the prompt.
            (self.fake, {"level_id": 999}),
        ):
            with self.subTest(body=body):
                set_image_generator(generator)
                response = self.call("POST", "/images/generate-profile-picture", self.ana, body=body)
                self.assert_error(
                    response, 500, "api_error_code.image_generation_failed", "Profile picture generation failed"
                )

    def test_without_an_api_key_generation_is_unavailable(self):
        self.without_api_key()

        for path, body in (("/images/generate-profile-picture", {}), ("/images/generate-banana", {"prompt": "x"})):
            with self.subTest(path=path):
                response = self.call("POST", path, self.ana, body=body)
                self.assert_error(
                    response, 503, "api_error_code.image_generation_unavailable", "Image generation unavailable"
                )
                self.assertEqual(self.call("POST", path, body=body).status_code, 401)

    def test_clients_learn_whether_generation_is_available(self):
        response = self.call("GET", "/images/generation", self.ana)
        self.assertEqual((response.status_code, response.json), (200, {"available": True}))

        self.without_api_key()
        response = self.call("GET", "/images/generation", self.ana)
        self.assertEqual((response.status_code, response.json), (200, {"available": False}))
        self.assertEqual(self.call("GET", "/images/generation").status_code, 401)

    def test_a_picture_from_a_prompt_as_json(self):
        response = self.call("POST", "/images/generate-banana", self.ana, body={"prompt": "a banana"})

        self.assertEqual(response.status_code, 200, response.json)
        newest = self.history(self.ana)[0]
        self.assertEqual((newest.id, newest.level_id), (response.json["id"], self.ana.level_id))
        self.assertEqual((response.json["image_base64"], response.json["mime_type"]), (IMAGE, "image/png"))

    def test_generating_from_a_prompt_needs_one(self):
        for body in ({}, {"prompt": ""}):
            with self.subTest(body=body):
                response = self.call("POST", "/images/generate-banana", self.ana, body=body)
                self.assertEqual(response.status_code, 400)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], ["/body/prompt"])
        set_image_generator(FakeImageGenerator(image=None))
        response = self.call("POST", "/images/generate-banana", self.ana, body={"prompt": "x"})
        self.assert_error(response, 500, "api_error_code.image_generation_failed", "No image generated")

    def test_a_generator_error_is_kept_from_the_client(self):
        set_image_generator(RaisingImageGenerator())

        with self.assertLogs("back.src.interactor.profile_pictures", "ERROR"):
            response = self.call("POST", "/images/generate-banana", self.ana, body={"prompt": "x"})

        self.assert_error(response, 500, "api_error_code.image_generation_failed", "Image generation failed")
        self.assertNotIn("sk-secret", response.get_data(as_text=True))

    def test_choosing_the_candidate(self):
        first = add_picture(self.ana, "/static/a.png", 10, candidate=True)
        second = add_picture(self.ana, "/static/b.png", 5)

        response = self.call("POST", f"/images/set-candidate-picture/{second.id}", self.ana)

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        self.assertEqual(
            [(e.id, e.is_candidate) for e in self.history(self.ana)], [(second.id, True), (first.id, False)]
        )

    def test_only_the_owner_chooses_the_candidate(self):
        picture = add_picture(self.ana, "/static/a.png", 10)

        self.assert_error(
            self.call("POST", f"/images/set-candidate-picture/{picture.id}", self.ben), 403, "api_error_code.forbidden"
        )
        self.assert_error(
            self.call("POST", "/images/set-candidate-picture/999", self.ana), 404, "api_error_code.resource_not_found"
        )
        self.assertEqual(self.call("POST", f"/images/set-candidate-picture/{picture.id}").status_code, 401)
