from back.src.driver.database import db
from back.src.entity.preparation_type import PreparationType
from back.src.interactor.preparation_types import DefaultPreparationType, PreparationTypes
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.test.support import AppTest


class PreparationTypesTest(AppTest):
    def setUp(self):
        super().setUp()
        self.session = self.make_session("s1")
        self.prep_types = PreparationTypes()

    def stored(self) -> set[tuple[str, int | None]]:
        db.session.commit()
        return {(p.name, p.session_id) for p in db.session.query(PreparationType)}

    def test_add_to_a_session_or_as_a_default(self):
        self.prep_types.add("Grilled", self.session)
        self.prep_types.add("Smoked", None)

        self.assertLessEqual({("Grilled", self.session.id), ("Smoked", None)}, self.stored())

    def test_delete_a_sessions_own(self):
        grilled = self.prep_types.add("Grilled", self.session)
        before = self.stored()

        self.prep_types.delete(grilled)

        self.assertEqual(self.stored(), before - {("Grilled", self.session.id)})

    def test_a_default_type_stays(self):
        default = PreparationTypeRepository().defaults()[0]
        before = self.stored()

        with self.assertRaises(DefaultPreparationType):
            self.prep_types.delete(default)

        self.assertEqual(self.stored(), before)
