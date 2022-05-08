import json

from back.src.model.domain.base import SerializableMixin


class ApiView:
    def __init__(self):
        pass

    def get(self, items):
        return json.dumps([x.as_dict() for x in items], default=str)

    def scalar(self, key, value):
        if isinstance(value, SerializableMixin):
            return json.dumps({key: value.as_dict()}, default=str)
        else:
            return json.dumps({key: value}, default=str)
