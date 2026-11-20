import logging
from io import TextIOWrapper
from pathlib import Path

from flask import Config, Flask, Response, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.exceptions import NotFound

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi, init_api_rules, serialize_error
from back.src.api.registry import APIS
from back.src.driver.migrations import migrate


class _LazyFileHandler(logging.FileHandler):
    """Creates the file, and its folder, only when the first record is written."""

    def __init__(self, filename: Path) -> None:
        super().__init__(filename, delay=True)

    def _open(self) -> TextIOWrapper:
        Path(self.baseFilename).parent.mkdir(parents=True, exist_ok=True)
        return super()._open()


class App(Flask):
    def __init__(
        self,
        name: str,
        db: SQLAlchemy,
        config: type[Config],
        apis: list[type[BaseApi]] | None = None,
        frontend_folder: Path | None = None,
    ) -> None:
        # No Flask static route: it would answer every path before `serve` can fall back to index.html.
        super().__init__(name, static_folder=None)
        self.frontend_folder = Path(self.root_path) / "static" if frontend_folder is None else frontend_folder
        self.apis = APIS if apis is None else apis
        self.db = db
        self.config.from_object(config)
        self.db.init_app(self)

        with self.app_context() as app_context:
            migrate(self.db)
            self.init_levels()
            self.init_achievements()
            # After the levels: the admin starts at the lowest.
            self.init_admin_user()
            self.init_preparation_types()
            # Initialize achievement registry with evaluators
            from back.src.interactor.achievement_registry import initialize_registry

            initialize_registry()
            # The context stays pushed; a transaction left open in it would keep the database locked.
            self.db.session.remove()
            app_context.push()

        self.init_mikado_api()
        self.add_url_rule(rule="/", defaults={"path": ""}, view_func=self.serve, methods=["GET"])
        self.add_url_rule(rule="/<path:path>", view_func=self.serve, methods=["GET"])

        self.init_logging()

        self.register_error_handler(ApiError, self.invalid_api_usage)
        self.register_error_handler(404, self.page_not_found)

    def serve(self, path: str) -> Response:
        """A file of the frontend build, else its index.html, so the browser router gets `/login`, `/<session>`, …"""
        if path == "api" or path.startswith("api/"):
            raise NotFound()
        if path and (self.frontend_folder / path).is_file():
            return send_from_directory(self.frontend_folder, path)
        if "." in path.rsplit("/", 1)[-1]:
            # A missing asset, e.g. a chunk of an older build: the index in its place would hide that.
            raise NotFound()
        return send_from_directory(self.frontend_folder, "index.html")

    def log_on_error(self, response: Response) -> Response:
        if 400 <= response.status_code < 500:
            if response.json:
                self.logger.info(response.json)
            else:
                self.logger.info(response.status)
        elif 500 <= response.status_code < 600:
            self.logger.error(response.json)
        return response

    def init_mikado_api(self) -> None:
        api_rules = init_api_rules(self.apis, self.db.session)
        self.register_blueprint(api_rules)

    def init_admin_user(self) -> None:
        """Create the admin user from ADMIN_PASSWORD if there is none; an existing admin is left alone."""
        from back.src.interactor.accounts import Accounts
        from back.src.repository.user_repository import UserRepository

        if UserRepository().by_name("admin"):
            return
        password = self.config.get("ADMIN_PASSWORD")
        if not password:
            logging.warning("No admin user exists and RACLOTTO_ADMIN_PASSWORD is not set; none was created")
            return

        Accounts().create_user("admin", "admin@raclotto.local", password, is_admin=True)
        self.db.session.commit()
        logging.info("Admin user created successfully")

    def init_preparation_types(self) -> None:
        """Initialize default preparation types if they don't exist."""
        from back.src.entity.preparation_type import PreparationType
        from back.src.repository.preparation_type_repository import (
            PreparationTypeRepository,
        )

        prep_type_repository = PreparationTypeRepository()
        default_name = "Raclotto Pfanne"
        default_types = prep_type_repository.defaults()
        existing = next((pt for pt in default_types if pt.name == default_name), None)

        if not existing:
            default_prep_type = PreparationType(
                name=default_name,
                session_id=None,  # None means it's a default/system-wide type
            )
            self.db.session.add(default_prep_type)
            self.db.session.commit()
            logging.info(f"Default preparation type '{default_name}' created successfully")

    def init_achievements(self) -> None:
        """Create the seeded achievements that don't exist, by key, and update the others."""
        from back.src.driver.seed_data import ACHIEVEMENTS
        from back.src.entity.achievement import Achievement
        from back.src.repository.achievement_repository import AchievementRepository

        existing = {achievement.key: achievement for achievement in AchievementRepository().all()}
        created = 0
        for seed in ACHIEVEMENTS:
            achievement = existing.get(seed.key)
            if achievement is None:
                achievement = Achievement(key=seed.key)
                self.db.session.add(achievement)
                created += 1
            achievement.title = seed.title
            achievement.value = seed.value
            achievement.hidden = seed.hidden
        self.db.session.commit()
        if created:
            logging.info(f"Initialized {created} achievements")

    def init_levels(self) -> None:
        """Create the seeded levels if they don't exist."""
        from back.src.driver.seed_data import LEVELS
        from back.src.entity.level import Level
        from back.src.repository.level_repository import LevelRepository

        level_repository = LevelRepository()
        existing_levels = level_repository.all()
        existing_names = {level.name for level in existing_levels}

        new_levels = []
        for level_data in LEVELS:
            if level_data.name not in existing_names:
                # Create a new Level entity from the default data
                new_level = Level(
                    name=level_data.name,
                    required_experience=level_data.required_experience,
                    label_en=level_data.label_en,
                    label_de=level_data.label_de,
                )
                new_levels.append(new_level)

        if new_levels:
            self.db.session.add_all(new_levels)
            self.db.session.commit()
            logging.info(f"Initialized {len(new_levels)} levels")

        # The seeds are unsaved rows without an id; a stored level is the one with the seed's name.
        for level_data in LEVELS:
            existing = next((level for level in existing_levels if level.name == level_data.name), None)
            if existing and existing.required_experience != level_data.required_experience:
                existing.required_experience = level_data.required_experience
                self.db.session.commit()
                logging.info(f"Updated level: {level_data.name}")

    def init_logging(self) -> None:
        log_file = self.config.get("LOG_FILE")
        if log_file:
            log_format_str = "%(asctime)s - %(levelname)s - p%(process)s - %(pathname)s:%(lineno)d - %(message)s"
            file_handler = _LazyFileHandler(Path(self.instance_path) / log_file)
            file_handler.setFormatter(logging.Formatter(log_format_str, "%d.%m.%y %H:%M:%S"))
            self.logger.addHandler(file_handler)

        self.logger.setLevel(logging.DEBUG)
        self.after_request(self.log_on_error)

    @staticmethod
    def page_not_found(_: object) -> tuple[Response, int]:
        code = ApiErrorCode.endpoint_not_found
        error = ApiError(
            code,
            status=404,
            title="Not Found",
            detail="The requested endpoint does not exist",
        )
        return jsonify(serialize_error(error)), 404

    def invalid_api_usage(self, e: ApiError) -> tuple[Response, int]:
        return jsonify(serialize_error(e)), e.status
