"""Pans: rename a pan, or delete it with its ratings, and let achievements react.

    Pans().rename(pan, "Lunch")
    Pans().delete(pan)

Deleting takes the pan's ratings and ingredient links with it and reports ``PanDeleted``, so the
revocable achievements that count pans judge again. The XP the pan earned stays with its author,
and session events that named it stay as they were announced. Who may rename or delete a pan is
``Permissions.rename_pan`` / ``delete_pan``; nothing here checks.
Changes are flushed; the endpoint commits the request's transaction (ADR 0008).
"""

from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.interactor.achievements import Achievements
from back.src.interactor.facts import PanDeleted
from back.src.repository.user_repository import UserRepository


class Pans:
    def __init__(self, achievements: Achievements | None = None):
        self._achievements = achievements or Achievements()
        self._users = UserRepository()

    def rename(self, pan: Pan, name: str) -> None:
        pan.name = name
        db.session.flush()

    def delete(self, pan: Pan) -> None:
        fact = PanDeleted(pan_id=pan.id, author=self._users.by_id(pan.user_id), session=pan.session)
        db.session.delete(pan)
        self._achievements.record(fact)
