from datetime import datetime, timedelta

from sqlalchemy import text

from back.src.driver.database import db
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User
from back.src.interactor.profile_pictures import GeminiImageGenerator, PictureError, ProfilePictures
from back.src.repository.level_repository import LevelRepository
from back.src.repository.profile_picture_history_repository import ProfilePictureHistoryRepository
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
    """Records whether the session was in a transaction when the image was drawn."""

    def __init__(self):
        super().__init__()
        self.in_transaction: list[bool] = []

    def generate(self, contents: list) -> str | None:
        self.in_transaction.append(db.session().in_transaction())
        return super().generate(contents)


class RaisingImageGenerator(FakeImageGenerator):
    def generate(self, contents: list) -> str | None:
        raise RuntimeError("quota exceeded for key sk-secret")


def add_picture(
    user: User, picture: str | None, minutes_ago: int, candidate: bool = False, level_id: int | None = None
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


class ProfilePicturesTest(AppTest):
    def setUp(self):
        super().setUp()
        self.fake = FakeImageGenerator()
        self.pictures = ProfilePictures(self.fake)
        self.levels = LevelRepository().all_ordered()
        self.ana = self.make_user("ana", experience_points=self.levels[1].required_experience)
        self.ben = self.make_user("ben")

    def history(self, user: User) -> list[ProfilePictureHistory]:
        return ProfilePictureHistoryRepository().by_user_id(user.id)

    def test_generating_for_a_level_starts_from_the_candidate(self):
        add_picture(self.ana, "data:image/png;base64,first", 10)
        add_picture(self.ana, "data:image/png;base64,chosen", 5, candidate=True)
        level = self.levels[2]

        picture = self.pictures.generate_for_level(self.ana, level.id)

        [contents] = self.fake.calls
        self.assertIn(level.label_de, contents[0])
        self.assertEqual(contents[1], {"inline_data": {"mime_type": "image/png", "data": "chosen"}})
        self.assertEqual(self.history(self.ana)[0], picture)
        self.assertEqual(
            (picture.user_id, picture.profile_picture, picture.level_id, picture.is_candidate),
            (self.ana.id, f"data:image/png;base64,{IMAGE}", level.id, False),
        )

    def test_without_a_chosen_candidate_generation_starts_from_the_first_picture(self):
        add_picture(self.ana, "data:image/png;base64,first", 10)
        add_picture(self.ana, "data:image/png;base64,second", 5)

        self.pictures.generate_for_level(self.ana)

        self.assertEqual(self.fake.calls[0][1]["inline_data"]["data"], "first")

    def test_without_a_level_the_picture_is_for_the_users_level(self):
        picture = self.pictures.generate_for_level(self.ana)

        self.assertEqual(picture.level_id, self.ana.level_id)
        # Without earlier pictures the prompt goes alone, and the first picture becomes the candidate.
        self.assertEqual(len(self.fake.calls[0]), 1)
        self.assertTrue(picture.is_candidate)

    def test_generating_from_a_prompt_saves_the_users_picture(self):
        picture = self.pictures.generate_from_prompt(self.ana, "a banana")

        self.assertEqual(self.fake.calls, [["a banana"]])
        self.assertEqual(self.history(self.ana), [picture])
        self.assertEqual(
            (picture.profile_picture, picture.level_id), (f"data:image/png;base64,{IMAGE}", self.ana.level_id)
        )

    def test_the_generator_draws_outside_a_transaction(self):
        probe = TransactionProbe()
        pictures = ProfilePictures(probe)
        add_picture(self.ana, "data:image/png;base64,chosen", 5, candidate=True)

        for generate in (
            lambda: pictures.generate_for_level(self.ana),
            lambda: pictures.generate_from_prompt(self.ana, "x"),
        ):
            db.session.execute(text("SELECT 1"))
            self.assertTrue(db.session().in_transaction())
            generate()

        # A transaction holds the database's write lock (ADR 0007); the image model takes seconds.
        self.assertEqual(probe.in_transaction, [False, False])

    def test_a_failed_generation_says_why_and_saves_nothing(self):
        for generator, level_id, kind in (
            (FakeImageGenerator(image=None), None, PictureError.NO_IMAGE),
            (self.fake, 999, PictureError.UNKNOWN_LEVEL),
        ):
            with self.subTest(kind=kind), self.assertRaises(PictureError) as raised:
                ProfilePictures(generator).generate_for_level(self.ana, level_id)
            self.assertEqual(raised.exception.kind, kind)
        with self.assertRaises(PictureError) as raised:
            ProfilePictures(FakeImageGenerator(image=None)).generate_from_prompt(self.ana, "x")
        self.assertEqual(raised.exception.kind, PictureError.NO_IMAGE)
        # An unknown level fails the prompt before the model is asked.
        self.assertEqual(self.fake.calls, [])
        self.assertEqual(self.history(self.ana), [])

    def test_a_generator_error_is_logged_and_reported_as_failed(self):
        with (
            self.assertLogs("back.src.interactor.profile_pictures", "ERROR") as logs,
            self.assertRaises(PictureError) as raised,
        ):
            ProfilePictures(RaisingImageGenerator()).generate_from_prompt(self.ana, "x")

        self.assertEqual(raised.exception.kind, PictureError.FAILED)
        self.assertIn("sk-secret", "\n".join(logs.output))
        self.assertEqual(self.history(self.ana), [])

    def test_without_an_api_key_nothing_is_generated(self):
        with self.assertLogs("back.src.interactor.profile_pictures"):
            pictures = ProfilePictures(GeminiImageGenerator(api_key=None))

        self.assertEqual((pictures.available, self.pictures.available), (False, True))
        for generate in (
            lambda: pictures.generate_for_level(self.ana),
            lambda: pictures.generate_from_prompt(self.ana, "x"),
        ):
            with self.assertRaises(PictureError) as raised:
                generate()
            self.assertEqual(raised.exception.kind, PictureError.UNAVAILABLE)
        self.assertEqual(self.history(self.ana), [])

    def test_choosing_the_candidate(self):
        first = add_picture(self.ana, "/static/a.png", 10, candidate=True)
        second = add_picture(self.ana, "/static/b.png", 5)

        self.pictures.choose_candidate(self.ana, second.id)

        self.assertEqual(
            [(e.id, e.is_candidate) for e in self.history(self.ana)], [(second.id, True), (first.id, False)]
        )

    def test_only_the_owner_chooses_a_picture_that_exists(self):
        picture = add_picture(self.ana, "/static/a.png", 10)

        for user, picture_id, kind in (
            (self.ben, picture.id, PictureError.NOT_YOURS),
            (self.ana, 999, PictureError.NOT_FOUND),
        ):
            with self.subTest(kind=kind), self.assertRaises(PictureError) as raised:
                self.pictures.choose_candidate(user, picture_id)
            self.assertEqual(raised.exception.kind, kind)
        self.assertFalse(picture.is_candidate)
