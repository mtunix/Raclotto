from sqlalchemy import select

from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.entity.rating import Rating
from back.test.support import AppTest


class TestPanRating(AppTest):
    """`Pan.rating` averages a pan's ratings on a loaded pan and in a query."""

    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.ben = self.make_user("ben")
        self.session = self.make_session("s1", creator=self.ana)
        potato = self.make_ingredient(self.session, "Potato")
        self.good = self.make_pan(self.ana, self.session, [potato])
        self.poor = self.make_pan(self.ana, self.session, [potato])
        for pan, rater, stars in ((self.good, self.ana, 5), (self.good, self.ben, 4), (self.poor, self.ben, 2)):
            db.session.add(Rating(rating=stars, user_id=rater.id, pan_id=pan.id, session_id=self.session.id))
        db.session.commit()

    def test_a_query_selects_the_same_average_as_the_loaded_pan(self):
        rows = db.session.execute(select(Pan.id, Pan.rating).order_by(Pan.id)).all()

        self.assertEqual([tuple(row) for row in rows], [(self.good.id, 4.5), (self.poor.id, 2.0)])
        self.assertEqual((self.good.rating, self.poor.rating), (4.5, 2.0))

    def test_a_query_filters_pans_by_their_average(self):
        self.assertEqual(db.session.scalars(select(Pan.id).where(Pan.rating >= 4)).all(), [self.good.id])
