"""Preparation types: add one to a session or as a default, and delete a session's own.

    prep_type = PreparationTypes().add("Grilled", session)   # None: a default type
    PreparationTypes().delete(prep_type)

A default type belongs to every session and stays: deleting one raises ``DefaultPreparationType``.
Who may add a default is ``Permissions.change_global``; nothing here checks. The endpoint commits
the request's transaction (ADR 0008).
"""

from back.src.driver.database import db
from back.src.entity.preparation_type import PreparationType
from back.src.entity.raclotto_session import RaclottoSession


class DefaultPreparationType(Exception):
    """Default preparation types can't be deleted."""


class PreparationTypes:
    def add(self, name: str, session: RaclottoSession | None) -> PreparationType:
        prep_type = PreparationType(name=name, session_id=session.id if session else None)
        db.session.add(prep_type)
        db.session.flush()
        return prep_type

    def delete(self, prep_type: PreparationType) -> None:
        if prep_type.session_id is None:
            raise DefaultPreparationType(prep_type.id)
        db.session.delete(prep_type)
        db.session.flush()
