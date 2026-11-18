from back.src.driver.database import db
from back.src.dto.insult import InsultDto
from back.src.entity.insult import Insult
from back.test.support import AppTest


class InsultApiTest(AppTest):
    def setUp(self):
        super().setUp()
        self.ana = self.make_user("ana")
        self.insult = Insult(title="Thermomixer")
        db.session.add(self.insult)
        db.session.commit()

    def test_list_and_get(self):
        listed = self.call("GET", "/insults", self.ana)
        got = self.call("GET", f"/insults/{self.insult.id}", self.ana)

        self.assertEqual(listed.json, [{"id": self.insult.id, "title": "Thermomixer"}])
        self.assertEqual(got.json, listed.json[0])
        self.assertEqual(self.call("GET", "/insults/999", self.ana).status_code, 404)
        self.assertEqual(self.call("GET", "/insults").status_code, 401)

    def test_create(self):
        response = self.call("POST", "/insults", self.ana, body={"title": "Langweiler"})

        self.assertEqual(response.status_code, 200)
        created = InsultDto.model_validate(response.json)
        self.assertEqual(db.session.get_one(Insult, created.id).title, "Langweiler")

    def test_create_and_update_need_a_title(self):
        for method, path in (("POST", "/insults"), ("PATCH", f"/insults/{self.insult.id}")):
            for body in ({}, {"title": ""}, {"title": "x", "text": "y"}):
                with self.subTest(method=method, body=body):
                    self.assertEqual(self.call(method, path, self.ana, body=body).status_code, 400)

    def test_update(self):
        response = self.call("PATCH", f"/insults/{self.insult.id}", self.ana, body={"title": "Panner"})

        self.assertEqual(response.json, {"id": self.insult.id, "title": "Panner"})
        self.assertEqual(self.call("PATCH", "/insults/999", self.ana, body={"title": "x"}).status_code, 404)

    def test_delete(self):
        response = self.call("DELETE", f"/insults/{self.insult.id}", self.ana)

        self.assertEqual((response.status_code, response.get_data()), (204, b""))
        self.assertEqual(db.session.query(Insult).count(), 0)
        self.assertEqual(self.call("DELETE", f"/insults/{self.insult.id}", self.ana).status_code, 404)
