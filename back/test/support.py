"""Shared base for tests that need the real app on an in-memory database."""

import unittest
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from datetime import datetime, timedelta

from sqlalchemy import event

from back.src.api.base_api import BaseApi
from back.src.api.registry import APIS
from back.src.auth.jwt import generate_token
from back.src.auth.throttle import LoginThrottle
from back.src.driver.app import App
from back.src.driver.config import ConfigInMemory
from back.src.driver.database import db
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.invite_token import InviteToken
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.achievement_registry import initialize_registry
from back.src.repository.level_repository import LevelRepository


class ConfigTest(ConfigInMemory):
    DEBUG = False


_apps: dict[tuple[type[BaseApi], ...], App] = {}


def get_app(extra_apis: Sequence[type[BaseApi]] = ()) -> App:
    """The test app, built once per set of extra API classes mounted next to the real ones."""
    key = tuple(extra_apis)
    if key not in _apps:
        _apps[key] = App("raclotto-test", db, ConfigTest, apis=APIS + list(key))
    return _apps[key]


class AppTest(unittest.TestCase):
    """Fresh schema + default data (levels, achievements, preparation types) per test."""

    extra_apis: Sequence[type[BaseApi]] = ()

    def setUp(self):
        self.app = get_app(self.extra_apis)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.session.remove()
        db.drop_all()
        db.create_all()
        self.app.init_levels()
        self.app.init_achievements()
        self.app.init_preparation_types()
        initialize_registry()
        self.app.extensions["login_throttle"] = LoginThrottle()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def make_user(self, name: str, experience_points: int = 0, **diet) -> User:
        level = LevelRepository().by_experience(experience_points)
        user = User(
            name=name,
            password="x",
            experience_points=experience_points,
            level_id=level.id if level else None,
            **diet,
        )
        db.session.add(user)
        db.session.commit()
        return user

    def make_session(self, key: str = "s1", creator: User | None = None) -> RaclottoSession:
        session = RaclottoSession(key=key, name=key, created_by_user_id=creator.id if creator else None)
        db.session.add(session)
        db.session.commit()
        return session

    def make_ingredient(
        self, session: RaclottoSession, name: str, kind: IngredientType = IngredientType.FILL, **flags
    ) -> Ingredient:
        if not any(flags.get(c) for c in ("meat", "vegetarian", "vegan", "fish")):
            flags["vegan"] = True
        ingredient = Ingredient(name=name, type=kind, session_id=session.id, **flags)
        db.session.add(ingredient)
        db.session.commit()
        return ingredient

    def make_pan(self, user: User, session: RaclottoSession, ingredients, minutes_ago: int = 0) -> Pan:
        pan = Pan(
            name="pan",
            user_id=user.id,
            session_id=session.id,
            ingredients=list(ingredients),
            timestamp=datetime.now() - timedelta(minutes=minutes_ago),
        )
        db.session.add(pan)
        db.session.commit()
        return pan

    def make_invite(self, creator: User, expires_in_days: int = 7, used: bool = False) -> InviteToken:
        invite = InviteToken(
            token=InviteToken.generate_token(),
            created_by_user_id=creator.id,
            expires_at=datetime.now() + timedelta(days=expires_in_days),
            is_used=used,
        )
        db.session.add(invite)
        db.session.commit()
        return invite

    @contextmanager
    def recorded_writes(self) -> Iterator[list[str]]:
        """The INSERT, UPDATE and DELETE statements sent to the database inside the block."""
        statements: list[str] = []

        def record(conn, cursor, statement, *args):
            if statement.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
                statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            yield statements
        finally:
            event.remove(db.engine, "before_cursor_execute", record)

    def bearer(self, user: User) -> dict:
        token = generate_token(user.id, self.app.config["JWT_SECRET_KEY"], user.token_version)
        return {"Authorization": f"Bearer {token}"}

    def call(
        self,
        method: str,
        path: str,
        user: User | None = None,
        body: dict | None = None,
        query: dict | None = None,
    ):
        """Call an endpoint with plain JSON, as the generated client does."""
        return self.client.open(
            "/api" + path,
            method=method,
            query_string=query,
            json=body,
            headers={"Accept": "application/json", **(self.bearer(user) if user else {})},
        )
