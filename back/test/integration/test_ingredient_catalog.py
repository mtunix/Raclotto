from back.src.driver.database import db
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.achievements import AchievementChanges, Achievements
from back.src.interactor.diet import Diet
from back.src.interactor.facts import CatalogChanged, Fact, IngredientAdded
from back.src.interactor.ingredient_catalog import (
    AvailableCounts,
    CatalogError,
    CatalogItem,
    IngredientCatalog,
    Reimported,
)
from back.src.interactor.sessions import Sessions
from back.test.support import AppTest

FILL, SAUCE = IngredientType.FILL, IngredientType.SAUCE


class Recording(Achievements):
    def __init__(self) -> None:
        super().__init__()
        self.facts: list[Fact] = []

    def record(self, fact: Fact) -> AchievementChanges:
        self.facts.append(fact)
        return super().record(fact)


def held(user: User) -> set[str | None]:
    db.session.refresh(user)
    return {a.title for a in user.achievements}


def fields(name: str = "Leek", kind: IngredientType = FILL, **flags) -> dict:
    if not any(flags.get(c) for c in ("meat", "vegetarian", "vegan", "fish")):
        flags["vegan"] = True
    return {"name": name, "type": kind, **flags}


class IngredientCatalogTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.session = self.make_session("s1", creator=self.ana)
        self.achievements = Recording()
        self.catalog = IngredientCatalog(achievements=self.achievements)

    def stored(self, ingredient_id: int) -> Ingredient:
        db.session.commit()
        db.session.expire_all()
        return db.session.get_one(Ingredient, ingredient_id)

    def in_session(self, session: RaclottoSession) -> dict[str | None, Ingredient]:
        db.session.commit()
        db.session.expire_all()
        return {i.name: i for i in db.session.query(Ingredient).filter_by(session_id=session.id)}

    def unavailable(self, ingredient: Ingredient) -> Ingredient:
        ingredient.available = False
        db.session.commit()
        return ingredient

    def changed(self, session: RaclottoSession | None = None) -> list[Fact]:
        return [CatalogChanged(session=session or self.session, actor=self.ana)]


class TestAdd(IngredientCatalogTest):
    def test_add_puts_the_ingredient_in_the_session_and_reports_it(self):
        added = self.catalog.add(self.ana, self.session, fields("Chili", SAUCE, spicy=3, sweet=True, gluten=True))

        stored = self.stored(added.id)
        self.assertEqual((stored.name, stored.type, stored.session_id), ("Chili", SAUCE, self.session.id))
        self.assertEqual((stored.spicy, stored.sweet, stored.gluten, stored.available), (3, True, True, True))
        self.assertEqual((stored.vegan, stored.meat, stored.wildcard), (True, False, False))
        self.assertEqual(
            self.achievements.facts, [IngredientAdded(ingredient=added, user=self.ana, session=self.session)]
        )

    def test_adding_a_sauce_revokes_king_of_the_sauce_of_every_member(self):
        aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.make_pan(self.ana, self.session, [aioli])
        Sessions().join(self.ana, self.session)
        self.catalog.set_available(self.ana, aioli, True)
        self.assertIn("King of the Sauce", held(self.ana))

        self.catalog.add(self.make_user("ben"), self.session, fields("Mayo", SAUCE, vegetarian=True))

        self.assertNotIn("King of the Sauce", held(self.ana))

    def test_a_never_seen_ingredient_earns_connoisseur(self):
        self.make_ingredient(self.make_session("s2"), "Potato")

        self.catalog.add(self.ana, self.session, fields(" potato "))
        self.assertNotIn("Connoisseur", held(self.ana))
        self.catalog.add(self.ana, self.session, fields("Truffle"))
        self.assertIn("Connoisseur", held(self.ana))


class TestChange(IngredientCatalogTest):
    def setUp(self):
        super().setUp()
        self.leek = self.make_ingredient(self.session, "Leek", vegan=True, spicy=1)

    def test_update_changes_only_the_given_fields(self):
        self.catalog.update(self.ana, self.leek, {"name": "Spring onion", "spicy": 2})

        stored = self.stored(self.leek.id)
        self.assertEqual((stored.name, stored.spicy, stored.vegan, stored.type), ("Spring onion", 2, True, FILL))
        self.assertEqual(self.achievements.facts, self.changed())

    def test_update_changes_the_category(self):
        self.catalog.update(self.ana, self.leek, {"meat": True, "vegetarian": False, "vegan": False, "fish": False})

        stored = self.stored(self.leek.id)
        self.assertEqual((stored.meat, stored.vegan), (True, False))

    def test_an_unavailable_ingredient_stays_in_the_session_and_its_pans(self):
        pan = self.make_pan(self.ana, self.session, [self.leek])

        self.catalog.set_available(self.ana, self.leek, False)
        self.catalog.set_available(self.ana, self.leek, False)

        self.assertFalse(self.stored(self.leek.id).available)
        self.assertEqual(self.stored(self.leek.id).session_id, self.session.id)
        self.assertEqual([i.id for i in db.session.get_one(Pan, pan.id).ingredients], [self.leek.id])
        self.assertEqual(self.achievements.facts, self.changed() * 2)

    def test_refill_makes_it_available_again(self):
        self.unavailable(self.leek)

        self.catalog.set_available(self.ana, self.leek, True)

        self.assertTrue(self.stored(self.leek.id).available)
        self.assertEqual(self.achievements.facts, self.changed())

    def test_catalog_changes_rejudge_king_of_the_sauce(self):
        aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        mayo = self.make_ingredient(self.session, "Mayo", SAUCE, vegetarian=True)
        self.make_pan(self.ana, self.session, [aioli])
        self.assertNotIn("King of the Sauce", held(self.ana))

        self.catalog.set_available(self.ana, mayo, False)
        self.assertIn("King of the Sauce", held(self.ana))
        self.catalog.set_available(self.ana, mayo, True)
        self.assertNotIn("King of the Sauce", held(self.ana))
        self.catalog.update(self.ana, mayo, {"type": FILL})
        self.assertIn("King of the Sauce", held(self.ana))


class TestAvailableCounts(IngredientCatalogTest):
    def test_counts_the_available_fills_and_sauces_a_diet_allows_and_all_of_them(self):
        self.make_ingredient(self.session, "Potato", vegan=True)
        self.make_ingredient(self.session, "Cheese", vegetarian=True, lactose=True)
        self.make_ingredient(self.session, "Bacon", meat=True)
        self.make_ingredient(self.session, "Salmon", fish=True)
        self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.make_ingredient(self.session, "Tuna sauce", SAUCE, fish=True)
        self.unavailable(self.make_ingredient(self.session, "Gone", vegan=True))
        self.make_ingredient(self.make_session("s2"), "Leek", vegan=True)

        self.assertEqual(
            self.catalog.available_counts("s1", Diet.of(self.make_user("vera"))),
            AvailableCounts(fills=2, sauces=1, total_fills=4, total_sauces=2),
        )
        self.assertEqual(
            self.catalog.available_counts("s1", Diet.of(self.make_user("vic", vegetarian=False))),
            AvailableCounts(fills=1, sauces=0, total_fills=4, total_sauces=2),
        )

    def test_a_session_that_does_not_exist_has_none(self):
        self.assertEqual(self.catalog.available_counts("nope", Diet()), AvailableCounts(0, 0, 0, 0))


class TestImport(IngredientCatalogTest):
    def test_import_adds_every_item_as_new_whatever_it_names(self):
        other = self.make_ingredient(self.make_session("s2"), "Potato", vegan=True)
        items = [
            CatalogItem(fields("Potato", spicy=2), id=other.id, session_id=other.session_id),
            CatalogItem(fields("Pesto", SAUCE, vegetarian=True, available=False)),
        ]

        created = self.catalog.import_new(self.ana, self.session, items)

        stored = self.in_session(self.session)
        self.assertEqual(set(stored), {"Potato", "Pesto"})
        self.assertEqual({i.id for i in created}, {i.id for i in stored.values()})
        self.assertNotEqual(stored["Potato"].id, other.id)
        self.assertEqual((stored["Potato"].spicy, stored["Pesto"].type, stored["Pesto"].available), (2, SAUCE, False))
        self.assertEqual((self.stored(other.id).session_id, self.stored(other.id).spicy), (other.session_id, 0))
        self.assertEqual(self.achievements.facts, self.changed())

    def test_imports_rejudge_king_of_the_sauce(self):
        aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.make_pan(self.ana, self.session, [aioli])
        self.catalog.set_available(self.ana, aioli, True)
        self.assertIn("King of the Sauce", held(self.ana))

        self.catalog.import_new(self.ana, self.session, [CatalogItem(fields("Mayo", SAUCE))])
        self.assertNotIn("King of the Sauce", held(self.ana))

        self.catalog.reimport(
            self.ana, self.session, [CatalogItem(fields("Aioli", SAUCE, vegetarian=True), id=aioli.id)]
        )
        self.assertIn("King of the Sauce", held(self.ana))


class TestReimport(IngredientCatalogTest):
    def setUp(self):
        super().setUp()
        self.potato = self.make_ingredient(self.session, "Potato", vegan=True)
        self.pesto = self.unavailable(self.make_ingredient(self.session, "Pesto", SAUCE, vegetarian=True))
        self.leftover = self.make_ingredient(self.session, "Leftover", vegan=True)

    def test_reimport_updates_the_listed_creates_the_new_and_makes_the_unlisted_unavailable(self):
        items = [
            CatalogItem(fields("Sweet potato", spicy=1), id=self.potato.id, session_id=self.session.id),
            CatalogItem(fields("Pesto", SAUCE, vegetarian=True, available=True), id=self.pesto.id),
            CatalogItem(fields("Corn")),
        ]

        result = self.catalog.reimport(self.ana, self.session, items)

        self.assertEqual(result, Reimported(created=1, updated=2, unavailable=1))
        stored = self.in_session(self.session)
        self.assertEqual(set(stored), {"Sweet potato", "Pesto", "Leftover", "Corn"})
        self.assertEqual((stored["Sweet potato"].id, stored["Sweet potato"].spicy), (self.potato.id, 1))
        self.assertTrue(stored["Pesto"].available)
        self.assertEqual((stored["Leftover"].id, stored["Leftover"].available), (self.leftover.id, False))
        self.assertTrue(stored["Corn"].available)
        self.assertEqual(self.achievements.facts, self.changed())

    def test_reimport_counts_unlisted_ingredients_that_were_already_unavailable(self):
        result = self.catalog.reimport(self.ana, self.session, [])

        self.assertEqual(result, Reimported(created=0, updated=0, unavailable=3))
        self.assertFalse(any(i.available for i in self.in_session(self.session).values()))

    def rejected(self, items: list[CatalogItem]) -> CatalogError:
        with self.recorded_writes() as writes, self.assertRaises(CatalogError) as raised:
            self.catalog.reimport(self.ana, self.session, items)

        self.assertEqual(writes, [])
        self.assertEqual(self.achievements.facts, [])
        return raised.exception

    def test_reimport_rejects_an_item_of_another_session(self):
        other = self.make_ingredient(self.make_session("s2"), "Leek", vegan=True)
        item = CatalogItem(fields("Potato"), id=self.potato.id)

        error = self.rejected([item, CatalogItem(item.fields, id=self.potato.id, session_id=other.session_id)])

        self.assertEqual((error.kind, error.index), (CatalogError.OTHER_SESSION, 1))
        self.assertEqual(
            error.detail,
            "ingredients[1] belongs to a different session. "
            f"All ingredients must belong to session_id {self.session.id}",
        )
        self.assertTrue(self.stored(self.leftover.id).available)

    def test_reimport_rejects_an_id_the_session_does_not_have(self):
        other = self.make_ingredient(self.make_session("s2"), "Leek", vegan=True)

        error = self.rejected([CatalogItem(fields("Potato"), id=other.id)])

        self.assertEqual((error.kind, error.index), (CatalogError.UNKNOWN_INGREDIENT, 0))
        self.assertEqual(error.detail, f"ingredients[0] with id {other.id} does not exist in this session")
        self.assertEqual(self.stored(other.id).name, "Leek")
        self.assertTrue(self.stored(self.potato.id).available)
