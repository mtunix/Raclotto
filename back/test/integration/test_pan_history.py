from back.src.driver.database import db
from back.src.dto.pan import PanFilterOptionsDto, PanPageDto
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.src.entity.user import User
from back.test.support import AppTest


class TestPanHistory(AppTest):
    """The pan list sorts and filters every matching pan, not just the page it returns."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.carl = self.make_user("carl")
        self.session = self.make_session("s1", creator=self.ana)
        self.other = self.make_session("s2", creator=self.ben)
        self.ingredients = [self.make_ingredient(self.session, f"Ingredient {i}") for i in range(12)]

    def pan(self, minutes_ago: int, *stars: float, author: User | None = None, ingredients: int = 1) -> Pan:
        pan = self.make_pan(author or self.ana, self.session, self.ingredients[:ingredients], minutes_ago=minutes_ago)
        for rater, rating in zip((self.ana, self.ben, self.carl), stars, strict=False):
            db.session.add(Rating(rating=rating, user_id=rater.id, pan_id=pan.id, session_id=self.session.id))
        db.session.commit()
        return pan

    def page(self, **query) -> PanPageDto:
        response = self.call("GET", "/pans", self.ana, query={"session_key": "s1", **query})
        self.assertEqual(response.status_code, 200, response.json)
        return PanPageDto.model_validate(response.json)

    def ids(self, **query) -> list[int]:
        return [pan.id for pan in self.page(**query).items]

    def test_sorts_by_rating_across_pages(self):
        best = self.pan(100, 5)
        for minutes in range(12, 0, -1):
            self.pan(minutes, 1 + minutes % 3)

        first = self.page(sort="rating", direction="desc", limit=12)
        second = self.page(sort="rating", direction="desc", limit=12, offset=12)

        self.assertEqual(first.items[0].id, best.id)
        ratings = [pan.rating for pan in first.items + second.items]
        self.assertEqual(ratings, sorted(ratings, reverse=True))
        self.assertEqual((first.total, first.has_more, len(second.items), second.has_more), (13, True, 1, False))

    def test_sorting_by_rating_counts_unrated_as_zero_and_breaks_ties_newest_first(self):
        unrated = self.pan(5)
        old_four = self.pan(4, 4)
        two = self.pan(3, 2)
        new_four = self.pan(2, 5, 3)

        self.assertEqual(self.ids(sort="rating", direction="desc"), [new_four.id, old_four.id, two.id, unrated.id])
        self.assertEqual(self.ids(sort="rating", direction="asc"), [unrated.id, two.id, new_four.id, old_four.id])

    def test_sorts_by_time(self):
        pans = [self.pan(minutes) for minutes in (3, 1, 2)]

        self.assertEqual(self.ids(), [pans[1].id, pans[2].id, pans[0].id])
        self.assertEqual(self.ids(sort="time", direction="asc"), [pans[0].id, pans[2].id, pans[1].id])

    def test_sorts_by_ingredient_count(self):
        three = self.pan(3, ingredients=3)
        one = self.pan(2, ingredients=1)
        old_seven = self.pan(5, ingredients=7)
        new_seven = self.pan(1, ingredients=7)

        self.assertEqual(self.ids(sort="counts", direction="desc"), [new_seven.id, old_seven.id, three.id, one.id])
        self.assertEqual(self.ids(sort="counts", direction="asc", limit=2), [one.id, three.id])

    def test_filters_by_authors(self):
        by_ben = [self.pan(minutes, author=self.ben) for minutes in range(20, 7, -1)]
        by_carl = self.pan(5, author=self.carl)
        self.pan(1)

        page = self.page(user_id=[self.ben.id, self.carl.id], limit=12)

        newest_by_ben = [pan.id for pan in reversed(by_ben)][:11]
        self.assertEqual([pan.id for pan in page.items], [by_carl.id, *newest_by_ben])
        self.assertEqual((page.total, page.has_more), (14, True))

    def test_filters_by_rating_rounded_to_one_decimal(self):
        # 3.25 rounds half up to 3.3, as 10/3 does.
        old = [self.pan(minutes, 3.5, 3) for minutes in range(30, 17, -1)]
        third = self.pan(4, 3, 3, 4)
        whole = self.pan(3, 3)
        unrated = self.pan(2)

        first = self.page(rating=3.3, limit=12)
        second = self.page(rating=3.3, limit=12, offset=12)

        self.assertEqual([pan.id for pan in first.items + second.items], [third.id] + [pan.id for pan in reversed(old)])
        self.assertEqual((first.total, first.has_more), (14, True))
        self.assertEqual(self.ids(rating=[3, 0]), [unrated.id, whole.id])

    def test_filters_by_ingredient_count_ranges(self):
        sizes = {size: self.pan(20 - size, ingredients=size) for size in range(1, 12)}

        self.assertEqual(self.ids(ingredient_count="1-3"), [sizes[3].id, sizes[2].id, sizes[1].id])
        self.assertEqual(self.ids(ingredient_count=["4-6", "10+"]), [sizes[s].id for s in (11, 10, 6, 5, 4)])
        self.assertEqual(
            self.ids(ingredient_count="7-9", sort="counts", direction="asc"), [sizes[s].id for s in (7, 8, 9)]
        )

    def test_filters_combine(self):
        match = self.pan(3, 4, author=self.ben, ingredients=5)
        self.pan(2, 4, author=self.ben, ingredients=2)
        self.pan(1, 4, author=self.carl, ingredients=5)
        self.make_pan(self.ben, self.other, [self.make_ingredient(self.other, "Leek")], minutes_ago=4)

        page = self.page(user_id=self.ben.id, rating=4, ingredient_count="4-6")

        self.assertEqual(([pan.id for pan in page.items], page.total), ([match.id], 1))

    def test_rejects_unknown_sorts_and_ranges(self):
        for query, pointer in (
            ({"sort": "name"}, "/query/sort"),
            ({"direction": "up"}, "/query/direction"),
            ({"ingredient_count": "2-5"}, "/query/ingredient_count/0"),
            ({"rating": "good"}, "/query/rating/0"),
        ):
            with self.subTest(query=query):
                response = self.call("GET", "/pans", self.ana, query=query)
                self.assertEqual(response.status_code, 400, response.json)
                self.assertEqual([e["source"]["pointer"] for e in response.json["errors"]], [pointer])


class TestPanFilterOptions(AppTest):
    """What a whole session's pans offer to filter by."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.carl = self.make_user("carl")
        self.session = self.make_session("s1", creator=self.ana)
        self.ingredients = [self.make_ingredient(self.session, f"Ingredient {i}") for i in range(12)]

    def options(self, session_key: str = "s1") -> PanFilterOptionsDto:
        response = self.call("GET", "/pans/filters", self.ana, query={"session_key": session_key})
        self.assertEqual(response.status_code, 200, response.json)
        return PanFilterOptionsDto.model_validate(response.json)

    def rate(self, pan: Pan, *stars: float) -> None:
        for rater, rating in zip((self.ana, self.ben, self.carl), stars, strict=False):
            db.session.add(Rating(rating=rating, user_id=rater.id, pan_id=pan.id, session_id=self.session.id))
        db.session.commit()

    def test_covers_every_pan_of_the_session(self):
        self.rate(self.make_pan(self.ben, self.session, self.ingredients[:11], minutes_ago=100), 3, 3, 4)
        self.rate(self.make_pan(self.carl, self.session, self.ingredients[:2], minutes_ago=50), 5)
        for minutes in range(20):
            self.make_pan(self.ben, self.session, self.ingredients[:5], minutes_ago=minutes)
        other = self.make_session("s2", creator=self.ana)
        self.make_pan(self.ana, other, [self.make_ingredient(other, "Leek")])

        options = self.options()

        self.assertEqual([user.name for user in options.users], ["ben", "carl"])
        self.assertEqual(options.ratings, [5.0, 3.3])
        self.assertEqual(options.ingredient_counts, ["1-3", "4-6", "10+"])

    def test_an_unknown_session_offers_nothing(self):
        self.make_pan(self.ana, self.session, self.ingredients[:1])

        self.assertEqual(self.options("nope"), PanFilterOptionsDto(users=[], ratings=[], ingredient_counts=[]))
