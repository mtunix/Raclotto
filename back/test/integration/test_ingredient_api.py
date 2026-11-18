import json
from pathlib import Path

from back.src.driver.database import db
from back.src.dto.ingredient import IngredientDto, IngredientForUserDto
from back.src.entity.ingredient import Ingredient, IngredientType
from back.test.support import AppTest

FILL, SAUCE = IngredientType.FILL, IngredientType.SAUCE

# What GET /ingredients/export answered before the typed endpoints, for the ingredients that
# `TestExportAndImport.old_catalog` creates: the file users have downloaded and import again.
OLD_EXPORT = json.loads((Path(__file__).parents[1] / "fixtures/ingredient_export_before_dtos.json").read_text())

CATEGORY_RULE = {
    "none": ({}, "must have at least one of meat, vegetarian, vegan, or fish set to true"),
    "meat and vegan": (
        {"meat": True, "vegan": True},
        "cannot have meat=true with vegetarian, vegan, or fish=true (they are mutually exclusive)",
    ),
    "vegetarian and fish": (
        {"vegetarian": True, "fish": True},
        "cannot have vegetarian=true with vegan or fish=true (they are mutually exclusive)",
    ),
    "vegan and fish": (
        {"vegan": True, "fish": True},
        "cannot have both vegan=true and fish=true (they are mutually exclusive)",
    ),
}


def held(user) -> set:
    db.session.refresh(user)
    return {a.title for a in user.achievements}


class IngredientApiTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana", meat=True)
        self.session = self.make_session("s1", creator=self.ana)

    def errors(self, response, status: int = 400) -> list:
        self.assertEqual(response.status_code, status, response.json)
        return [(error["source"]["pointer"], error["detail"]) for error in response.json["errors"]]

    def pointers(self, response) -> list:
        return [pointer for pointer, _ in self.errors(response)]

    def stored(self, ingredient_id: int) -> Ingredient:
        db.session.expire_all()
        return db.session.get(Ingredient, ingredient_id)

    def in_session(self, session) -> list:
        db.session.expire_all()
        return db.session.query(Ingredient).filter_by(session_id=session.id).order_by(Ingredient.id).all()

    @staticmethod
    def fields(name: str = "Leek", kind: IngredientType = FILL, **flags) -> dict:
        return {"name": name, "type": int(kind), "vegan": True, **flags}


class TestListIngredients(IngredientApiTest):
    def setUp(self):
        super().setUp()
        self.potato = self.make_ingredient(self.session, "Potato", vegan=True)
        self.cheese = self.make_ingredient(self.session, "Cheese", vegetarian=True, lactose=True)
        self.bacon = self.make_ingredient(self.session, "Bacon", meat=True)
        self.salmon = self.make_ingredient(self.session, "Salmon", fish=True)
        self.other = self.make_ingredient(self.make_session("s2"), "Leek", vegan=True)

    def applicable(self, user) -> dict:
        response = self.call("GET", "/ingredients", user, query={"session_key": "s1"})
        self.assertEqual(response.status_code, 200, response.json)
        return {i["name"]: i["applicable"] for i in response.json}

    def test_each_ingredient_says_whether_the_users_diet_allows_it(self):
        diets = {
            "omnivore": ({"meat": True, "fish": True}, {"Potato", "Cheese", "Bacon", "Salmon"}),
            "meat eater": ({"meat": True}, {"Potato", "Cheese", "Bacon"}),
            "vegetarian": ({}, {"Potato", "Cheese"}),
            "pescetarian": ({"fish": True}, {"Potato", "Cheese", "Salmon"}),
            "vegan": ({"vegetarian": False}, {"Potato"}),
            "vegan who eats fish": ({"vegetarian": False, "fish": True}, {"Potato", "Salmon"}),
            "lactose intolerant": ({"meat": True, "fish": True, "lactose": False}, {"Potato", "Bacon", "Salmon"}),
        }
        for name, (diet, allowed) in diets.items():
            with self.subTest(diet=name):
                user = self.make_user(name, **diet)

                self.assertEqual(self.applicable(user), {
                    n: n in allowed for n in ("Potato", "Cheese", "Bacon", "Salmon")
                })

    def test_list_shape_and_filter(self):
        response = self.call("GET", "/ingredients", self.ana, query={"session_key": "s1"})

        self.assertEqual(set(response.json[0]), set(IngredientForUserDto.model_fields))
        self.assertEqual(set(IngredientForUserDto.model_fields) - set(IngredientDto.model_fields), {"applicable"})
        everywhere = self.call("GET", "/ingredients", self.ana)
        self.assertEqual({i["name"] for i in everywhere.json}, {"Potato", "Cheese", "Bacon", "Salmon", "Leek"})
        self.assertEqual(self.call("GET", "/ingredients", self.ana, query={"session_key": "nope"}).json, [])
        self.assertEqual(self.pointers(self.call("GET", "/ingredients", self.ana, query={"session_key": ""})),
                         ["/query/session_key"])
        self.assertEqual(self.call("GET", "/ingredients").status_code, 401)

    def test_available_counts(self):
        self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.make_ingredient(self.session, "Tuna sauce", SAUCE, fish=True)
        gone = self.make_ingredient(self.session, "Gone", vegan=True)
        gone.available = False
        db.session.commit()
        vegetarian = self.make_user("vera")

        response = self.call("GET", "/ingredients/available-counts", vegetarian, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json, {"fill_count": 2, "sauce_count": 1, "total_fill_count": 4, "total_sauce_count": 2})
        self.assertEqual(
            self.call("GET", "/ingredients/available-counts", vegetarian, query={"session_key": "nope"}).json,
            {"fill_count": 0, "sauce_count": 0, "total_fill_count": 0, "total_sauce_count": 0},
        )
        self.assertEqual(self.pointers(self.call("GET", "/ingredients/available-counts", vegetarian)),
                         ["/query/session_key"])

    def test_get_one(self):
        response = self.call("GET", f"/ingredients/{self.salmon.id}", self.ana)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(set(response.json), set(IngredientDto.model_fields))
        self.assertEqual((response.json["name"], response.json["fish"], response.json["type"]), ("Salmon", True, 1))
        self.assertEqual(self.call("GET", "/ingredients/999", self.ana).status_code, 404)
        self.assertEqual(self.call("GET", f"/ingredients/{self.salmon.id}").status_code, 401)


class TestCreateIngredient(IngredientApiTest):
    def create(self, body: dict, session_key="s1", user=None):
        query = {"session_key": session_key} if session_key is not None else None
        return self.call("POST", "/ingredients", user or self.ana, body=body, query=query)

    def test_create_adds_the_ingredient_to_the_session(self):
        response = self.create(self.fields("Chili", SAUCE, spicy=3, sweet=True, gluten=True))

        self.assertEqual(response.status_code, 200, response.json)
        created = IngredientDto.model_validate(response.json)
        stored = self.stored(created.id)
        self.assertEqual((stored.name, stored.type, stored.session_id), ("Chili", SAUCE, self.session.id))
        self.assertEqual((stored.spicy, stored.sweet, stored.gluten, stored.available), (3, True, True, True))
        self.assertEqual((stored.vegan, stored.meat, stored.wildcard), (True, False, False))

    def test_create_needs_a_known_session_in_the_query(self):
        self.assertEqual(self.pointers(self.create(self.fields(), session_key=None)), ["/query/session_key"])
        self.assertEqual(self.pointers(self.create({**self.fields(), "session_key": "s1"}, session_key=None)),
                         ["/query/session_key", "/body/session_key"])
        self.assertEqual(self.create(self.fields(), session_key="nope").status_code, 404)
        self.assertEqual(self.call("POST", "/ingredients", body=self.fields(), query={"session_key": "s1"}).status_code, 401)
        self.assertEqual(self.in_session(self.session), [])

    def test_create_enforces_one_category(self):
        for case, (flags, message) in CATEGORY_RULE.items():
            with self.subTest(case=case):
                body = {"name": "x", "type": 1, **flags}

                self.assertEqual(self.errors(self.create(body)), [("/body", message)])
        self.assertEqual(self.in_session(self.session), [])

    def test_create_validates_the_fields(self):
        self.assertEqual(self.pointers(self.create(self.fields(spicy=4))), ["/body/spicy"])
        self.assertEqual(self.pointers(self.create(self.fields(spicy=-1))), ["/body/spicy"])
        self.assertEqual(self.pointers(self.create(self.fields(name=""))), ["/body/name"])
        self.assertEqual(self.pointers(self.create(self.fields(type=3))), ["/body/type"])
        self.assertEqual(self.pointers(self.create({"vegan": True})), ["/body/name", "/body/type"])
        self.assertEqual(self.pointers(self.create(self.fields(available=False))), ["/body/available"])

    def test_adding_a_sauce_revokes_king_of_the_sauce(self):
        aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.call("POST", "/pans", self.ana, body={"ingredients": [aioli.id]}, query={"session_key": "s1"})
        self.assertIn("King of the Sauce", held(self.ana))

        ben = self.make_user("ben")
        response = self.create(self.fields("Mayo", SAUCE, vegan=False, vegetarian=True), user=ben)

        self.assertEqual(response.status_code, 200, response.json)
        self.assertNotIn("King of the Sauce", held(self.ana))

    def test_a_never_seen_ingredient_earns_connoisseur(self):
        self.make_ingredient(self.make_session("s2"), "Potato")

        self.create(self.fields(" potato "))
        self.assertNotIn("Connoisseur", held(self.ana))
        self.create(self.fields("Truffle"))
        self.assertIn("Connoisseur", held(self.ana))


class TestChangeIngredient(IngredientApiTest):
    def setUp(self):
        super().setUp()
        self.leek = self.make_ingredient(self.session, "Leek", vegan=True, spicy=1)

    def update(self, body: dict, ingredient_id=None):
        return self.call("PATCH", f"/ingredients/{ingredient_id or self.leek.id}", self.ana, body=body)

    def test_update_changes_only_the_given_fields(self):
        response = self.update({"name": "Spring onion", "spicy": 2})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual((response.json["name"], response.json["spicy"], response.json["vegan"]), ("Spring onion", 2, True))
        stored = self.stored(self.leek.id)
        self.assertEqual((stored.name, stored.spicy, stored.vegan, stored.type), ("Spring onion", 2, True, FILL))

    def test_the_category_changes_as_a_whole(self):
        response = self.update({"meat": True, "vegetarian": False, "vegan": False, "fish": False})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual((self.stored(self.leek.id).meat, self.stored(self.leek.id).vegan), (True, False))
        self.assertEqual(
            self.errors(self.update({"vegan": False, "fish": True})),
            [("/body", "give all of meat, vegetarian, vegan and fish to change the category")],
        )

    def test_update_enforces_one_category(self):
        for case, (flags, message) in CATEGORY_RULE.items():
            with self.subTest(case=case):
                body = {"meat": False, "vegetarian": False, "vegan": False, "fish": False, **flags}

                self.assertEqual(self.errors(self.update(body)), [("/body", message)])
        self.assertEqual((self.stored(self.leek.id).meat, self.stored(self.leek.id).vegan), (False, True))

    def test_update_validates_the_fields(self):
        self.assertEqual(self.pointers(self.update({})), ["/body"])
        self.assertEqual(self.pointers(self.update({"spicy": 4})), ["/body/spicy"])
        self.assertEqual(self.pointers(self.update({"name": None})), ["/body/name"])
        self.assertEqual(self.pointers(self.update({"available": False})), ["/body/available"])
        self.assertEqual(self.pointers(self.update({"session_id": 2})), ["/body/session_id"])
        self.assertEqual(self.update({"name": "x"}, ingredient_id=999).status_code, 404)

    def test_delete_marks_the_ingredient_unavailable(self):
        response = self.call("DELETE", f"/ingredients/{self.leek.id}", self.ana, query={"session_key": "s1"})

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        self.assertFalse(self.stored(self.leek.id).available)
        self.assertEqual(self.call("DELETE", f"/ingredients/{self.leek.id}", self.ana).status_code, 204)

    def test_delete_checks_the_session_key_when_given(self):
        self.make_session("s2")

        response = self.call("DELETE", f"/ingredients/{self.leek.id}", self.ana, query={"session_key": "s2"})

        self.assertEqual(self.errors(response),
                         [("/query/session_key", "Session key does not match ingredient's session")])
        self.assertTrue(self.stored(self.leek.id).available)
        self.assertEqual(self.call("DELETE", "/ingredients/999", self.ana).status_code, 404)

    def test_refill_makes_it_available_again(self):
        self.leek.available = False
        db.session.commit()

        response = self.call("POST", "/ingredients/refill", self.ana, body={"id": self.leek.id})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["available"])
        self.assertTrue(self.stored(self.leek.id).available)
        self.assertEqual(self.pointers(self.call("POST", "/ingredients/refill", self.ana, body={})), ["/body/id"])
        self.assertEqual(self.call("POST", "/ingredients/refill", self.ana, body={"id": 999}).status_code, 404)

    def test_catalog_changes_rejudge_king_of_the_sauce(self):
        aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        mayo = self.make_ingredient(self.session, "Mayo", SAUCE, vegetarian=True)
        self.make_pan(self.ana, self.session, [aioli])
        self.assertNotIn("King of the Sauce", held(self.ana))

        self.call("DELETE", f"/ingredients/{mayo.id}", self.ana)
        self.assertIn("King of the Sauce", held(self.ana))
        self.call("POST", "/ingredients/refill", self.ana, body={"id": mayo.id})
        self.assertNotIn("King of the Sauce", held(self.ana))
        self.update({"type": int(FILL)}, ingredient_id=mayo.id)
        self.assertIn("King of the Sauce", held(self.ana))


class TestExportAndImport(IngredientApiTest):
    def old_catalog(self):
        """The session and ingredients the old export fixture was captured from."""
        db.session.delete(self.session)
        db.session.commit()
        session = self.make_session("old-export", creator=self.ana)
        self.make_ingredient(session, "Potato", FILL, vegan=True, gluten=True)
        self.make_ingredient(session, "Salmon", FILL, fish=True, spicy=1, histamine=True)
        self.make_ingredient(session, "Bacon", FILL, meat=True, spicy=3, wildcard=True)
        pesto = self.make_ingredient(session, "Pesto", SAUCE, vegetarian=True, lactose=True, sweet=True)
        pesto.available = False
        db.session.commit()
        return session

    def ingredients_of(self, session) -> list:
        return [
            {k: v for k, v in IngredientDto.model_validate(i).model_dump(mode="json").items() if k not in ("id", "session_id")}
            for i in self.in_session(session)
        ]

    def test_export_is_the_file_format_users_already_have(self):
        session = self.old_catalog()

        response = self.call("GET", "/ingredients/export", self.ana, query={"session_key": "old-export"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(session.id, OLD_EXPORT["session_id"])
        self.assertEqual(response.json, OLD_EXPORT)

    def test_export_needs_a_known_session(self):
        self.assertEqual(self.pointers(self.call("GET", "/ingredients/export", self.ana)), ["/query/session_key"])
        self.assertEqual(self.call("GET", "/ingredients/export", self.ana, query={"session_key": "nope"}).status_code, 404)

    def test_an_old_export_file_imports_into_another_session(self):
        target = self.make_session("target")

        response = self.call("POST", "/ingredients/import", self.ana, query={"session_key": "target"},
                             body={"ingredients": OLD_EXPORT["ingredients"]})

        self.assertEqual(response.status_code, 201, response.json)
        self.assertEqual(response.json["created"], 4)
        self.assertEqual({i["session_id"] for i in response.json["ingredients"]}, {target.id})
        expected = [{k: v for k, v in i.items() if k not in ("id", "session_id")} for i in OLD_EXPORT["ingredients"]]
        self.assertEqual(self.ingredients_of(target), expected)

    def test_import_fills_in_defaults(self):
        target = self.make_session("target")

        response = self.call("POST", "/ingredients/import", self.ana, query={"session_key": "target"},
                             body={"ingredients": [{"name": "Corn", "type": 1, "vegan": True}]})

        self.assertEqual(response.status_code, 201, response.json)
        [corn] = self.in_session(target)
        self.assertEqual((corn.available, corn.spicy, corn.gluten, corn.sweet), (True, 0, False, False))

    def test_import_rejects_a_broken_item_and_imports_nothing(self):
        for case, (flags, message) in CATEGORY_RULE.items():
            with self.subTest(case=case):
                items = [self.fields("Good"), {"name": "Bad", "type": 1, **flags}]

                response = self.call("POST", "/ingredients/import", self.ana, query={"session_key": "s1"},
                                     body={"ingredients": items})

                self.assertEqual(self.errors(response), [("/body/ingredients/1", message)])
        missing = self.call("POST", "/ingredients/import", self.ana, query={"session_key": "s1"},
                            body={"ingredients": [{"type": 1, "vegan": True, "applicable": True}]})
        self.assertEqual(self.pointers(missing), ["/body/ingredients/0/name", "/body/ingredients/0/applicable"])
        self.assertEqual(self.pointers(self.call("POST", "/ingredients/import", self.ana, query={"session_key": "s1"},
                                                 body={})), ["/body/ingredients"])
        self.assertEqual(self.in_session(self.session), [])
        self.assertEqual(self.call("POST", "/ingredients/import", self.ana, query={"session_key": "nope"},
                                   body={"ingredients": []}).status_code, 404)

    def test_an_old_export_file_reimports_into_its_session(self):
        session = self.old_catalog()
        extra = self.make_ingredient(session, "Leftover", vegan=True)
        changed = [dict(item) for item in OLD_EXPORT["ingredients"]]
        changed[0]["name"] = "Sweet potato"
        changed[3]["available"] = True
        new = {"name": "Corn", "type": 1, "vegan": True}

        response = self.call("POST", "/ingredients/reimport", self.ana, query={"session_key": "old-export"},
                             body={"ingredients": changed + [new]})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual((response.json["created"], response.json["updated"], response.json["deleted"]), (1, 4, 1))
        stored = {i.name: i for i in self.in_session(session)}
        self.assertEqual(set(stored), {"Sweet potato", "Salmon", "Bacon", "Pesto", "Leftover", "Corn"})
        self.assertEqual(
            {i["name"] for i in response.json["ingredients"]}, set(stored)
        )
        self.assertFalse(stored["Leftover"].available)
        self.assertTrue(stored["Pesto"].available)
        self.assertEqual((stored["Salmon"].fish, stored["Salmon"].spicy, stored["Bacon"].wildcard), (True, 1, True))
        self.assertEqual(stored["Leftover"].id, extra.id)

    def test_reimport_counts_unlisted_ingredients_that_were_already_unavailable(self):
        gone = self.make_ingredient(self.session, "Gone", vegan=True)
        gone.available = False
        db.session.commit()

        response = self.call("POST", "/ingredients/reimport", self.ana, query={"session_key": "s1"},
                             body={"ingredients": []})

        self.assertEqual((response.json["created"], response.json["updated"], response.json["deleted"]), (0, 0, 1))

    def test_reimport_rejects_other_sessions_and_unknown_ids(self):
        potato = self.make_ingredient(self.session, "Potato", vegan=True)
        other = self.make_ingredient(self.make_session("s2"), "Leek", vegan=True)
        item = {"id": potato.id, "name": "Potato", "type": 1, "vegan": True}

        mixed = self.call("POST", "/ingredients/reimport", self.ana, query={"session_key": "s1"},
                          body={"ingredients": [item, {**item, "session_id": other.session_id}]})
        unknown = self.call("POST", "/ingredients/reimport", self.ana, query={"session_key": "s1"},
                            body={"ingredients": [{**item, "id": other.id}]})

        self.assertEqual(mixed.status_code, 400, mixed.json)
        [error] = mixed.json["errors"]
        self.assertEqual((error["title"], error["source"]["pointer"]), ("Mixed sessions", "/body/ingredients/1/session_id"))
        self.assertEqual(error["detail"], "ingredients[1] belongs to a different session. "
                                          f"All ingredients must belong to session_id {self.session.id}")
        self.assertEqual(unknown.status_code, 404, unknown.json)
        self.assertEqual(unknown.json["errors"][0]["detail"],
                         f"ingredients[0] with id {other.id} does not exist in this session")
        self.assertEqual(self.stored(other.id).name, "Leek")
        self.assertTrue(self.stored(potato.id).available)

    def test_reimport_enforces_one_category(self):
        potato = self.make_ingredient(self.session, "Potato", vegan=True)
        for case, (flags, message) in CATEGORY_RULE.items():
            with self.subTest(case=case):
                item = {"id": potato.id, "name": "Potato", "type": 1, **flags}

                response = self.call("POST", "/ingredients/reimport", self.ana, query={"session_key": "s1"},
                                     body={"ingredients": [item]})

                self.assertEqual(self.errors(response), [("/body/ingredients/0", message)])
        self.assertTrue(self.stored(potato.id).vegan)

    def test_imports_rejudge_king_of_the_sauce(self):
        aioli = self.make_ingredient(self.session, "Aioli", SAUCE, vegetarian=True)
        self.make_pan(self.ana, self.session, [aioli])
        self.call("POST", "/ingredients/refill", self.ana, body={"id": aioli.id})
        self.assertIn("King of the Sauce", held(self.ana))
        mayo = {"name": "Mayo", "type": 2, "vegetarian": True}

        self.call("POST", "/ingredients/import", self.ana, query={"session_key": "s1"}, body={"ingredients": [mayo]})
        self.assertNotIn("King of the Sauce", held(self.ana))

        only_aioli = {"id": aioli.id, "name": "Aioli", "type": 2, "vegetarian": True}
        self.call("POST", "/ingredients/reimport", self.ana, query={"session_key": "s1"},
                  body={"ingredients": [only_aioli]})
        self.assertIn("King of the Sauce", held(self.ana))
