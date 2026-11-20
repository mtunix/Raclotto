from back.src.driver.database import db
from back.src.dto.preparation_type import PrepTypeDto
from back.src.entity.preparation_type import PreparationType
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.test.support import AppTest


class TestPreparationTypeApi(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.s1 = self.make_session("s1")
        self.s2 = self.make_session("s2")
        self.defaults = {p.name for p in PreparationTypeRepository().defaults()}
        self.grilled = self.add("Grilled", self.s1.id)
        self.steamed = self.add("Steamed", self.s2.id)

    @staticmethod
    def add(name: str, session_id) -> PreparationType:
        prep_type = PreparationType(name=name, session_id=session_id)
        db.session.add(prep_type)
        db.session.commit()
        return prep_type

    def names(self, **query) -> set:
        response = self.call("GET", "/preparation_type", self.ana, query=query)
        self.assertEqual(response.status_code, 200, response.json)
        return {p["name"] for p in response.json}

    def test_a_session_lists_the_defaults_and_its_own(self):
        self.assertTrue(self.defaults)
        self.assertEqual(self.names(session_key="s1"), self.defaults | {"Grilled"})
        self.assertEqual(self.names(), self.defaults | {"Grilled", "Steamed"})

    def test_list_shape_and_errors(self):
        response = self.call("GET", "/preparation_type", self.ana, query={"session_key": "s1"})

        self.assertEqual(set(response.json[0]), set(PrepTypeDto.model_fields))
        self.assertEqual({p["session_id"] for p in response.json}, {None, self.s1.id})
        self.assertEqual(
            self.call("GET", "/preparation_type", self.ana, query={"session_key": "nope"}).status_code, 404
        )
        self.assertEqual(self.call("GET", "/preparation_type").status_code, 401)

    def test_create_adds_to_the_session(self):
        response = self.call("POST", "/preparation_type", self.ana, body={"name": "Fried"}, query={"session_key": "s1"})

        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual((response.json["name"], response.json["session_id"]), ("Fried", self.s1.id))
        self.assertIn("Fried", self.names(session_key="s1"))
        self.assertNotIn("Fried", self.names(session_key="s2"))

    def test_create_without_a_session_adds_a_default_type(self):
        root = self.make_user("root", is_admin=True)

        response = self.call("POST", "/preparation_type", root, body={"name": "Raw"})

        self.assertEqual((response.status_code, response.json["session_id"]), (200, None))
        self.assertIn("Raw", self.names(session_key="s2"))

    def test_only_an_admin_adds_a_default_type(self):
        response = self.call("POST", "/preparation_type", self.ana, body={"name": "Raw"})

        self.assertEqual(response.status_code, 403, response.json)
        self.assertNotIn("Raw", self.names())

    def test_create_validates(self):
        empty = self.call("POST", "/preparation_type", self.ana, body={"name": ""}, query={"session_key": "s1"})
        unknown = self.call("POST", "/preparation_type", self.ana, body={"name": "x"}, query={"session_key": "nope"})

        self.assertEqual([e["source"]["pointer"] for e in empty.json["errors"]], ["/body/name"])
        self.assertEqual(unknown.status_code, 404)
        self.assertEqual(self.names(), self.defaults | {"Grilled", "Steamed"})

    def test_delete_removes_a_session_type(self):
        response = self.call("DELETE", f"/preparation_type/{self.grilled.id}", self.ana)

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        self.assertNotIn("Grilled", self.names())
        self.assertEqual(self.call("DELETE", f"/preparation_type/{self.grilled.id}", self.ana).status_code, 404)

    def test_deleting_a_type_pans_were_made_with_leaves_them_without_one(self):
        ana = self.make_user("cook")
        pan = self.make_pan(ana, self.s1, [self.make_ingredient(self.s1, "Potato")])
        pan.preparation_type_id = self.grilled.id
        db.session.commit()

        response = self.call("DELETE", f"/preparation_type/{self.grilled.id}", self.ana)

        self.assertEqual(response.status_code, 204, response.json)
        fetched = self.call("GET", f"/pans/{pan.id}", self.ana).json
        self.assertEqual((fetched["preparation_type_id"], fetched["preparation_type"]), (None, None))

    def test_default_types_cannot_be_deleted(self):
        default = PreparationTypeRepository().defaults()[0]

        response = self.call("DELETE", f"/preparation_type/{default.id}", self.ana)

        self.assertEqual(response.status_code, 400, response.json)
        self.assertEqual(response.json["errors"][0]["title"], "Cannot delete default preparation type")
        self.assertEqual(self.names(), self.defaults | {"Grilled", "Steamed"})
