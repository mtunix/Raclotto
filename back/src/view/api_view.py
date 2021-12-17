import json


class ApiView:
    def __init__(self):
        pass

    def get(self, items):
        return json.dumps([x.as_dict() for x in items])
