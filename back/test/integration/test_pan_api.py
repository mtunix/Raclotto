from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import event, select

from back.src.driver.database import db
from back.src.dto.pan import PanDto, PanFilterOptionsDto, PanPageDto
from back.src.entity.pan import Pan, pan_ingredients
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

    def test_list_passes_every_filter_and_the_order_to_the_history(self):
        sides = [self.make_ingredient(self.s1, name) for name in ("Carrot", "Onion", "Bean")]
        carl = self.make_user("carl")
        mine = self.make_pan(self.ana, self.s1, [self.potato], minutes_ago=3)
        bens = self.make_pan(self.ben, self.s1, [self.potato], minutes_ago=2)
        too_big = self.make_pan(self.ben, self.s1, [self.potato, *sides], minutes_ago=1)
        elsewhere = self.make_pan(self.ben, self.s2, [self.leek])
        by_carl = self.make_pan(carl, self.s1, [self.potato])
        self.make_pan(self.ana, self.s1, [self.potato])
        for pan, stars in ((mine, 4), (bens, 2), (too_big, 4), (elsewhere, 4), (by_carl, 2)):
            db.session.add(Rating(rating=stars, user_id=self.ana.id, pan_id=pan.id, session_id=pan.session_id))
        db.session.commit()

        page = self.page(
            session_key="s1",
            user_id=[self.ana.id, self.ben.id],
            rating=[4, 2],
            ingredient_count=["1-3"],
            sort="rating",
            direction="asc",
        )

        self.assertEqual(([p.id for p in page.items], page.total), ([bens.id, mine.id], 2))

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
            ({"sort": "name"}, "/query/sort"),
            ({"direction": "up"}, "/query/direction"),
            ({"ingredient_count": "2-5"}, "/query/ingredient_count/0"),
            ({"rating": "good"}, "/query/rating/0"),
        ):
            with self.subTest(query=query):
                response = self.call("GET", "/pans", self.ana, query=query)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])

    def test_filter_options(self):
        rated = self.make_pan(self.ben, self.s1, [self.potato])
        db.session.add(Rating(rating=3.5, user_id=self.ana.id, pan_id=rated.id, session_id=self.s1.id))
        db.session.commit()

        response = self.call("GET", "/pans/filters", self.ana, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(PanFilterOptionsDto.model_fields))
        self.assertEqual([(u["id"], u["name"]) for u in response.json["users"]], [(self.ben.id, "ben")])
        self.assertEqual((response.json["ratings"], response.json["ingredient_counts"]), ([3.5], ["1-3"]))

    def test_filter_options_need_a_session(self):
        for query in ({}, {"session_key": ""}):
            with self.subTest(query=query):
                response = self.call("GET", "/pans/filters", self.ana, query=query)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], ["/query/session_key"])

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
        for method, body in (("GET", None), ("PATCH", {"name": "Lunch"}), ("DELETE", None)):
            with self.subTest(method):
                response = self.call(method, "/pans/999", self.ana, body=body)
                self.assertEqual(response.status_code, 404, response.json)
                self.assertEqual(response.json["errors"][0]["title"], "Pan not found")

    def test_patch_renames(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])

        renamed = self.call("PATCH", f"/pans/{pan.id}", self.ana, body={"name": "Lunch"})

        self.assertEqual(renamed.status_code, 200, renamed.json)
        self.assertEqual(renamed.json["name"], "Lunch")
        self.assertEqual(renamed.json["author"]["name"], "ana")
        db.session.expire_all()
        self.assertEqual(db.session.get_one(Pan, pan.id).name, "Lunch")

    def test_patch_rejects_fields_it_does_not_own(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])

        for body, pointer in (
            ({"name": "Lunch", "user_id": self.ben.id}, "/body/user_id"),
            ({"name": "Lunch", "session_id": self.s2.id}, "/body/session_id"),
            ({"snacked": True, "name": "Lunch"}, "/body/snacked"),
            ({"name": None}, "/body/name"),
            ({"name": ""}, "/body/name"),
            ({}, "/body/name"),
        ):
            with self.subTest(body=body):
                response = self.call("PATCH", f"/pans/{pan.id}", self.ana, body=body)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])

        db.session.expire_all()
        stored = db.session.get_one(Pan, pan.id)
        self.assertEqual((stored.user_id, stored.session_id, stored.name), (self.ana.id, self.s1.id, "pan"))

    def test_delete_is_204(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])

        response = self.call("DELETE", f"/pans/{pan.id}", self.ana)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.get_data(), b"")
        self.assertIsNone(db.session.get(Pan, pan.id))

    def test_deleting_a_rated_pan_deletes_its_ratings(self):
        rated = self.make_pan(self.ana, self.s1, [self.potato])
        kept = self.make_pan(self.ana, self.s1, [self.potato])
        db.session.add_all(
            [
                Rating(rating=4, user_id=self.ben.id, pan_id=rated.id, session_id=self.s1.id),
                Rating(rating=2, user_id=self.ana.id, pan_id=rated.id, session_id=self.s1.id),
                Rating(rating=5, user_id=self.ben.id, pan_id=kept.id, session_id=self.s1.id),
            ]
        )
        db.session.commit()

        response = self.call("DELETE", f"/pans/{rated.id}", self.ana)

        self.assertEqual(response.status_code, 204, response.json)
        db.session.expire_all()
        self.assertIsNone(db.session.get(Pan, rated.id))
        self.assertEqual([r.pan_id for r in db.session.query(Rating)], [kept.id])
        self.assertEqual(list(db.session.scalars(select(pan_ingredients.c.pan_id))), [kept.id])

    def test_reads_after_a_delete_leave_the_pan_out(self):
        gone = self.make_pan(self.ana, self.s1, [self.potato])
        kept = self.make_pan(self.ben, self.s1, [self.potato])
        db.session.add(Rating(rating=1, user_id=self.ben.id, pan_id=gone.id, session_id=self.s1.id))
        db.session.commit()

        self.assertEqual(self.call("DELETE", f"/pans/{gone.id}", self.ana).status_code, 204)

        self.assertEqual([p.id for p in self.page(session_key="s1").items], [kept.id])
        filters = self.call("GET", "/pans/filters", self.ana, query={"session_key": "s1"})
        self.assertEqual([u["id"] for u in filters.json["users"]], [self.ben.id])
        recap = self.call("GET", "/sessions/recap", self.ana, query={"session_key": "s1"})
        self.assertEqual((recap.json["pan_count"], recap.json["rating_count"]), (1, 0), recap.json)
        stats = self.call("GET", f"/users/{self.ana.id}/stats", self.ana)
        self.assertEqual(stats.status_code, 200, stats.json)
        self.assertEqual(self.call("GET", "/stats", self.ana).status_code, 200)

    def test_only_the_author_changes_a_pan_and_an_admin_renames_it(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])
        root = self.make_user("root", is_admin=True)

        renamed = self.call("PATCH", f"/pans/{pan.id}", self.ben, body={"name": "Mine"})
        deleted = self.call("DELETE", f"/pans/{pan.id}", self.ben)
        deleted_by_admin = self.call("DELETE", f"/pans/{pan.id}", root)

        self.assertEqual((renamed.status_code, deleted.status_code, deleted_by_admin.status_code), (403, 403, 403))
        db.session.expire_all()
        self.assertEqual(db.session.get_one(Pan, pan.id).name, "pan")
        self.assertEqual(self.call("PATCH", f"/pans/{pan.id}", root, body={"name": "Root's"}).status_code, 200)

    def test_pan_routes_require_auth(self):
        pan = self.make_pan(self.ana, self.s1, [self.potato])
        for method, path, body in (
            ("GET", "/pans", None),
            ("GET", "/pans/filters", None),
            ("GET", f"/pans/{pan.id}", None),
            ("PATCH", f"/pans/{pan.id}", {"user_id": 1}),
            ("DELETE", f"/pans/{pan.id}", None),
        ):
            with self.subTest(method=method, path=path):
                self.assertEqual(self.call(method, path, body=body).status_code, 401)
        self.assertIsNotNone(db.session.get(Pan, pan.id))
