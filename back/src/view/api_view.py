import json


class ApiView:
    def __init__(self):
        pass

    def get(self, items):
        return json.dumps([x.as_dict() for x in items])

    def scalar(self, key, value):
        return json.dumps({key: value})
