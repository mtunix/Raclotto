from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import event

from back.src.driver.database import db
from back.src.dto.pan import PanDto, PanPageDto
from back.src.entity.pan import Pan
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.test.support import AppTest


class TestPanApi(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", color="#00ff00", border_style="dashed", glow_effect=True)
        self.ben = self.make_user("ben")
        self.s1 = self.make_session("s1", creator=self.ana)
        self.s2 = self.make_session("s2", creator=self.ben)
        self.potato = self.make_ingredient(self.s1, "Potato")
        self.leek = self.make_ingredient(self.s2, "Leek")

    def page(self, user: User | None = None, **query) -> PanPageDto:
        response = self.call("GET", "/pans", user or self.ana, query=query)
        self.assertEqual(response.status_code, 200, response.json)
        return PanPageDto.model_validate(response.json)

    @staticmethod
    def alone(user_id: int) -> User:
        """The user, loaded into an emptied session so a request loads everything else itself."""
        db.session.expunge_all()
        return db.session.get_one(User, user_id)

    @contextmanager
    def count_selects(self) -> Iterator[list[str]]:
        statements: list[str] = []

        def record(conn, cursor, statement, *args):
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            yield statements
        finally:
            event.remove(db.engine, "before_cursor_execute", record)

    def test_list_pages_newest_first(self):
        pans = [self.make_pan(self.ana, self.s1, [self.potato], minutes_ago=m) for m in (5, 4, 3, 2, 1)]

        first = self.page(session_key="s1", limit=2)
        last = self.page(session_key="s1", limit=2, offset=4)

        self.assertEqual([p.id for p in first.items], [pans[4].id, pans[3].id])
        self.assertEqual((first.total, first.limit, first.offset, first.has_more), (5, 2, 0, True))
        self.assertEqual([p.id for p in last.items], [pans[0].id])
        self.assertEqual((last.total, last.limit, last.offset, last.has_more), (5, 2, 4, False))

    def test_list_without_limit_returns_everything(self):
        self.make_pan(self.ana, self.s1, [self.potato])
        self.make_pan(self.ben, self.s2, [self.leek])

        page = self.page()

        self.assertEqual(len(page.items), 2)
        self.assertEqual((page.total, page.limit, page.offset, page.has_more), (2, None, 0, False))

    def test_list_filters_by_session_and_user(self):
        mine = self.make_pan(self.ana, self.s1, [self.potato])
        bens_here = self.make_pan(self.ben, self.s1, [self.potato])
        bens_there = self.make_pan(self.ben, self.s2, [self.leek])

        self.assertEqual({p.id for p in self.page(session_key="s1").items}, {mine.id, bens_here.id})
        self.assertEqual({p.id for p in self.page(user_id=self.ben.id).items}, {bens_here.id, bens_there.id})
        self.assertEqual([p.id for p in self.page(session_key="s1", user_id=self.ben.id).items], [bens_here.id])
        self.assertEqual(self.page(session_key="nope").items, [])

    def test_listed_pans_carry_their_author(self):
        db.session.add(ProfilePictureHistory(user_id=self.ana.id, profile_picture="/pics/ana.png"))
        db.session.commit()
        self.make_pan(self.ana, self.s1, [self.potato])

        [pan] = self.page(session_key="s1").items

        assert pan.author is not None
        self.assertEqual(
            pan.author.model_dump(),
            {
                "id": self.ana.id,
                "name": "ana",
                "color": "#00ff00",
                "profile_picture": "/pics/ana.png",
                "border_style": "dashed",
                "border_texture": None,
                "glow_effect": True,
            },
        )

    def test_author_defaults_cover_missing_and_retired_styles(self):
        self.ben.color = None
        self.ben.border_style = "ridge"
        self.ben.border_texture = "crispy"
        self.ben.glow_effect = None
        db.session.commit()
        self.make_pan(self.ben, self.s2, [self.leek])

        [pan] = self.page(session_key="s2").items

        assert pan.author is not None
        self.assertEqual(
            (pan.author.color, pan.author.border_style, pan.author.border_texture, pan.author.glow_effect),
            ("#1890ff", "solid", None, False),
        )

    def test_a_missing_author_is_null(self):
        ghost = self.make_user("ghost")
        pan = self.make_pan(ghost, self.s1, [self.potato])
        db.session.delete(ghost)
        db.session.commit()

        [listed] = self.page(session_key="s1").items
        fetched = PanDto.model_validate(self.call("GET", f"/pans/{pan.id}", self.ana).json)

        self.assertIsNone(listed.author)
        self.assertIsNone(fetched.author)
        self.assertEqual(listed.user_id, fetched.user_id)

    def test_listing_loads_authors_together(self):
        carl = self.make_user("carl")
        for user in (self.ana, self.ben, carl):
            self.make_pan(user, self.s1, [self.potato])
            self.make_pan(user, self.s1, [self.potato])

        ana = self.alone(self.ana.id)
        with self.count_selects() as one_pan:
            self.page(ana, session_key="s1", limit=1)
        ana = self.alone(self.ana.id)
        with self.count_selects() as six_pans:
            page = self.page(ana, session_key="s1")

        self.assertEqual(len(page.items), 6)
        self.assertEqual({p.author.name if p.author else None for p in page.items}, {"ana", "ben", "carl"})
        self.assertEqual(len(six_pans), len(one_pan), "\n".join(six_pans))

    def test_list_query_is_validated(self):
        for query, pointer in (
            ({"limit": 0}, "/query/limit"),
            ({"offset": -1}, "/query/offset"),
            ({"user_id": "ana"}, "/query/user_id/0"),
            ({"session_key": ""}, "/query/session_key"),
            ({"page": 2}, "/query/page"),
        ):
            with self.subTest(query=query):
                response = self.call("GET", "/pans", self.ana, query=query)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])

    def test_get_pan(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])
        db.session.add_all(
            [
                Rating(rating=4, user_id=self.ben.id, pan_id=pan.id, session_id=self.s1.id),
                Rating(rating=3, user_id=self.ana.id, pan_id=pan.id, session_id=self.s1.id),
            ]
        )
        db.session.commit()

        response = self.call("GET", f"/pans/{pan.id}", self.ben)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(PanDto.model_fields))
        dto = PanDto.model_validate(response.json)
        self.assertEqual(dto.rating, 3.5)
        self.assertEqual(sorted(r.rating for r in dto.ratings), [3, 4])
        self.assertEqual([i.name for i in dto.ingredients], ["Potato"])
        assert dto.author is not None
        self.assertEqual(dto.author.name, "ana")
        self.assertEqual(response.json["timestamp"], pan.timestamp.isoformat())

    def test_missing_pan_is_404(self):
        for method, body in (("GET", None), ("PATCH", {"snacked": True}), ("DELETE", None)):
            with self.subTest(method):
                response = self.call(method, "/pans/999", self.ana, body=body)
                self.assertEqual(response.status_code, 404, response.json)
                self.assertEqual(response.json["errors"][0]["title"], "Pan not found")

    def test_patch_changes_name_and_snacked(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])

        response = self.call("PATCH", f"/pans/{pan.id}", self.ana, body={"snacked": True})
        renamed = self.call("PATCH", f"/pans/{pan.id}", self.ana, body={"name": "Lunch"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["snacked"])
        self.assertEqual(response.json["name"], "pan")
        self.assertEqual(renamed.status_code, 200, renamed.json)
        self.assertEqual((renamed.json["name"], renamed.json["snacked"]), ("Lunch", True))
        self.assertEqual(renamed.json["author"]["name"], "ana")
        db.session.expire_all()
        stored = db.session.get_one(Pan, pan.id)
        self.assertEqual((stored.name, stored.snacked), ("Lunch", True))

    def test_patch_rejects_fields_it_does_not_own(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])

        for body, pointer in (
            ({"user_id": self.ben.id}, "/body/user_id"),
            ({"session_id": self.s2.id}, "/body/session_id"),
            ({"snacked": True, "user_id": self.ben.id}, "/body/user_id"),
            ({"name": None}, "/body/name"),
            ({"name": ""}, "/body/name"),
            ({}, "/body"),
        ):
            with self.subTest(body=body):
                response = self.call("PATCH", f"/pans/{pan.id}", self.ana, body=body)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])

        db.session.expire_all()
        stored = db.session.get_one(Pan, pan.id)
        self.assertEqual(
            (stored.user_id, stored.session_id, stored.snacked, stored.name), (self.ana.id, self.s1.id, False, "pan")
        )

    def test_delete_is_204(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])

        response = self.call("DELETE", f"/pans/{pan.id}", self.ana)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.get_data(), b"")
        self.assertIsNone(db.session.get(Pan, pan.id))

    def test_only_the_author_or_an_admin_changes_a_pan(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])
        root = self.make_user("root", is_admin=True)

        renamed = self.call("PATCH", f"/pans/{pan.id}", self.ben, body={"name": "Mine"})
        deleted = self.call("DELETE", f"/pans/{pan.id}", self.ben)

        self.assertEqual((renamed.status_code, deleted.status_code), (403, 403))
        db.session.expire_all()
        self.assertEqual(db.session.get_one(Pan, pan.id).name, "pan")
        self.assertEqual(self.call("PATCH", f"/pans/{pan.id}", root, body={"snacked": True}).status_code, 200)
        self.assertEqual(self.call("DELETE", f"/pans/{pan.id}", root).status_code, 204)

    def test_pan_routes_require_auth(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])
        for method, path, body in (
            ("GET", "/pans", None),
            ("GET", f"/pans/{pan.id}", None),
            ("PATCH", f"/pans/{pan.id}", {"user_id": 1}),
            ("DELETE", f"/pans/{pan.id}", None),
        ):
            with self.subTest(method=method, path=path):
                self.assertEqual(self.call(method, path, body=body).status_code, 401)
        self.assertIsNotNone(db.session.get(Pan, pan.id))
