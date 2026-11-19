from datetime import datetime, timedelta

from pydantic import TypeAdapter

from back.src.driver.database import db
from back.src.dto.profile_picture import GeneratedPictureDto, ProfilePictureDto
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.interactor.profile_pictures import (
    GeminiImageGenerator,
    PictureError,
    ProfilePictures,
    set_image_generator,
)
from back.src.repository.level_repository import LevelRepository
from back.test.support import AppTest

IMAGE = "aW1hZ2U="


class FakeImageGenerator:
    def __init__(self, image: str | None = IMAGE):
        self.image = image
        self.calls: list[list] = []

    @property
    def available(self) -> bool:
        return True

    def generate(self, contents: list) -> str | None:
        self.calls.append(contents)
        return self.image


class TransactionProbe(FakeImageGenerator):
    """Records whether the request's session was in a transaction when the image was drawn."""

    def __init__(self):
        super().__init__()
        self.in_transaction: list[bool] = []

    def generate(self, contents: list) -> str | None:
        self.in_transaction.append(db.session().in_transaction())
        return super().generate(contents)


class RaisingImageGenerator(FakeImageGenerator):
    def generate(self, contents: list) -> str | None:
        raise RuntimeError("quota exceeded for key sk-secret")


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

    def add_picture(
        self, user, picture: str | None, minutes_ago: int, candidate: bool = False, level_id: int | None = None
    ) -> ProfilePictureHistory:
        entry = ProfilePictureHistory(
            user_id=user.id,
            profile_picture=picture,
            level_id=level_id,
            is_candidate=candidate,
            created_at=datetime.now() - timedelta(minutes=minutes_ago),
        )
        db.session.add(entry)
        db.session.commit()
        return entry

    def history(self, user) -> list[ProfilePictureDto]:
        response = self.call("GET", f"/images/profile-picture-history/{user.id}", self.ben)
        self.assertEqual(response.status_code, 200, response.json)
        return TypeAdapter(list[ProfilePictureDto]).validate_python(response.json)

    def without_api_key(self):
        set_image_generator(GeminiImageGenerator(api_key=None))

    def test_history_is_newest_first_with_its_levels(self):
        old = self.add_picture(self.ana, "/static/old.png", 10, level_id=self.levels[0].id)
        removed = self.add_picture(self.ana, None, 5)
        new = self.add_picture(self.ana, "data:image/png;base64,abc", 1, candidate=True, level_id=self.levels[1].id)
        self.add_picture(self.ben, "/static/ben.png", 1)

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

    def test_generating_a_profile_picture_starts_from_the_candidate(self):
        self.add_picture(self.ana, "data:image/png;base64,first", 10)
        self.add_picture(self.ana, "data:image/png;base64,chosen", 5, candidate=True)
        level = self.levels[2]

        response = self.call("POST", "/images/generate-profile-picture", self.ana, body={"level_id": level.id})

        self.assertEqual(response.status_code, 200, response.json)
        [contents] = self.fake.calls
        self.assertIn(level.label_de, contents[0])
        self.assertEqual(contents[1], {"inline_data": {"mime_type": "image/png", "data": "chosen"}})
        newest = self.history(self.ana)[0]
        self.assertEqual(newest.profile_picture, f"data:image/png;base64,{IMAGE}")
        self.assertEqual(newest.level_id, level.id)
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

    def test_the_generator_draws_outside_a_transaction(self):
        probe = TransactionProbe()
        set_image_generator(probe)
        self.add_picture(self.ana, "data:image/png;base64,chosen", 5, candidate=True)

        for path, body in (("/images/generate-profile-picture", {}), ("/images/generate-banana", {"prompt": "x"})):
            with self.subTest(path=path):
                self.assertEqual(self.call("POST", path, self.ana, body=body).status_code, 200)

        # A transaction holds the database's write lock (ADR 0007); the image model takes seconds.
        self.assertEqual(probe.in_transaction, [False, False])

    def test_without_a_level_the_picture_is_for_the_users_level(self):
        response = self.call("POST", "/images/generate-profile-picture", self.ana, body={})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["level_id"], self.ana.level_id)
        # Without earlier pictures the prompt goes alone, and the first picture becomes the candidate.
        self.assertEqual(len(self.fake.calls[0]), 1)
        self.assertTrue(self.history(self.ana)[0].is_candidate)

    def test_a_failed_generation_is_500_and_saves_nothing(self):
        for generator, body in (
            (FakeImageGenerator(image=None), {}),
            # The level comes from the client; an unknown one fails the prompt.
            (self.fake, {"level_id": 999}),
        ):
            with self.subTest(body=body):
                set_image_generator(generator)
                response = self.call("POST", "/images/generate-profile-picture", self.ana, body=body)
                self.assertEqual(response.status_code, 500)
                self.assertEqual(response.json["errors"][0]["title"], "Profile picture generation failed")
        self.assertEqual(self.history(self.ana), [])

    def test_without_an_api_key_generation_is_unavailable(self):
        self.without_api_key()

        for path, body in (("/images/generate-profile-picture", {}), ("/images/generate-banana", {"prompt": "x"})):
            with self.subTest(path=path):
                response = self.call("POST", path, self.ana, body=body)
                self.assertEqual(response.status_code, 503)
                [error] = response.json["errors"]
                self.assertEqual(
                    (error["code"], error["title"]),
                    ("api_error_code.image_generation_unavailable", "Image generation unavailable"),
                )
                self.assertEqual(self.call("POST", path, body=body).status_code, 401)
        with self.assertRaises(PictureError) as raised:
            ProfilePictures().generate_for_level(self.ana)
        self.assertEqual(raised.exception.kind, PictureError.UNAVAILABLE)
        self.assertEqual(self.history(self.ana), [])

    def test_clients_learn_whether_generation_is_available(self):
        response = self.call("GET", "/images/generation", self.ana)
        self.assertEqual((response.status_code, response.json), (200, {"available": True}))

        self.without_api_key()
        response = self.call("GET", "/images/generation", self.ana)
        self.assertEqual((response.status_code, response.json), (200, {"available": False}))
        self.assertEqual(self.call("GET", "/images/generation").status_code, 401)

    def test_generating_from_a_prompt_saves_the_users_picture(self):
        response = self.call("POST", "/images/generate-banana", self.ana, body={"prompt": "a banana"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(self.fake.calls, [["a banana"]])
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
        self.assertEqual((response.status_code, response.json["errors"][0]["title"]), (500, "No image generated"))

    def test_a_generator_error_is_logged_and_kept_from_the_client(self):
        set_image_generator(RaisingImageGenerator())

        with self.assertLogs("back.src.interactor.profile_pictures", "ERROR") as logs:
            response = self.call("POST", "/images/generate-banana", self.ana, body={"prompt": "x"})

        self.assertEqual((response.status_code, response.json["errors"][0]["title"]), (500, "Image generation failed"))
        self.assertNotIn("sk-secret", response.get_data(as_text=True))
        self.assertIn("sk-secret", "\n".join(logs.output))
        self.assertEqual(self.history(self.ana), [])

    def test_choosing_the_candidate(self):
        first = self.add_picture(self.ana, "/static/a.png", 10, candidate=True)
        second = self.add_picture(self.ana, "/static/b.png", 5)

        response = self.call("POST", f"/images/set-candidate-picture/{second.id}", self.ana)

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        self.assertEqual(
            [(e.id, e.is_candidate) for e in self.history(self.ana)], [(second.id, True), (first.id, False)]
        )

    def test_only_the_owner_chooses_the_candidate(self):
        picture = self.add_picture(self.ana, "/static/a.png", 10)

        self.assertEqual(self.call("POST", f"/images/set-candidate-picture/{picture.id}", self.ben).status_code, 403)
        self.assertEqual(self.call("POST", "/images/set-candidate-picture/999", self.ana).status_code, 404)
        self.assertEqual(self.call("POST", f"/images/set-candidate-picture/{picture.id}").status_code, 401)
        self.assertFalse(self.history(self.ana)[0].is_candidate)
