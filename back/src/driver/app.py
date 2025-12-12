import logging
from pathlib import Path
from typing import Type, Dict

from flask import Flask, Config, send_from_directory, Response, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from swagger_ui import api_doc

from back.src.driver.api_custom import apis_custom
from back.src.api.base_api import ApiError, init_api_rules, ApiErrorCode
from back.src.utils import str_code_from_enum


class App(Flask):
    def __init__(
            self,
            name: str,
            db: SQLAlchemy,
            config: Type[Config]
    ):
        super().__init__(name, static_folder="static", static_url_path="")
        self.debug = True
        self.db = db
        self.config.from_object(config)
        self.db.init_app(self)

        with self.app_context() as app_context:
            self.db.create_all()
            self.init_admin_user()
            self.init_achievements()
            self.init_preparation_types()
            # Initialize achievement registry with evaluators
            from back.src.interactor.achievement_registry import initialize_registry
            initialize_registry()
            # Initialize event registry with evaluators
            from back.src.interactor.event_registry import initialize_registry as initialize_event_registry
            initialize_event_registry()
            app_context.push()

        self.init_mikado_api()
        self.add_url_rule(rule='/', defaults={'path': ''}, view_func=self.serve, methods=['GET'])
        self.add_url_rule(rule='/<path:path>', view_func=self.serve, methods=['GET'])

        if self.config["DOCUMENTATION"]:
            api_doc(self, config_path='raclotto_spec.json', url_prefix='/api/docs', title='Raclotto API')

        self.init_logging()

        self.register_error_handler(ApiError, self.invalid_api_usage)
        self.register_error_handler(404, self.page_not_found)

    def serve(self, path):
        print(self.static_folder)
        if path != "" and Path(f"{self.static_folder}/{path}").exists():
            return send_from_directory(self.static_folder, path)
        else:
            return send_from_directory(self.static_folder, 'index.html')

    def print_all_endpoints(self):
        """Can be useful for debugging and maybe for documentation"""
        for rule in self.url_map.iter_rules():
            logging.info([rule.rule, rule.methods])


    def log_on_error(self, response: Response):
        if 400 <= response.status_code < 500:
            if response.json:
                self.logger.info(response.json)
            else:
                self.logger.info(response.status)
        elif 500 <= response.status_code < 600:
            self.logger.error(response.json)
        return response

    def start(self, port: int):
        self.run(port=port, host="0.0.0.0")

    def init_mikado_api(self):
        api_rules = init_api_rules(
            apis_custom,
            self.db.session
        )
        self.register_blueprint(api_rules)

    def init_admin_user(self):
        """Create admin user if it doesn't exist."""
        from back.src.entity.user import User
        from back.src.auth.password import hash_password
        from back.src.repository.user_repository import UserRepository
        
        user_repository = UserRepository()
        admin_user = user_repository.by_name("admin")
        if not admin_user:
            admin_user = User(
                name="admin",
                email="admin@raclotto.local",
                password=hash_password("admin")
            )
            self.db.session.add(admin_user)
            self.db.session.commit()
            logging.info("Admin user created successfully")

    def init_preparation_types(self):
        """Initialize default preparation types if they don't exist."""
        from back.src.entity.preparation_type import PreparationType
        from back.src.repository.preparation_type_repository import PreparationTypeRepository
        
        prep_type_repository = PreparationTypeRepository()
        default_name = "Raclotto Pfanne"
        default_types = prep_type_repository.default_types()
        existing = next((pt for pt in default_types if pt.name == default_name), None)
        
        if not existing:
            default_prep_type = PreparationType(
                name=default_name,
                session_id=None  # None means it's a default/system-wide type
            )
            self.db.session.add(default_prep_type)
            self.db.session.commit()
            logging.info(f"Default preparation type '{default_name}' created successfully")

    def init_achievements(self):
        """Initialize achievements from default_data if they don't exist."""
        from back.src.entity.achievement import Achievement
        from back.src.model.default_data import ACHIEVEMENTS
        from back.src.repository.achievement_repository import AchievementRepository
        
        achievement_repository = AchievementRepository()
        existing_achievements = achievement_repository.all()
        existing_titles = {ach.title for ach in existing_achievements}
        
        new_achievements = []
        for achievement_data in ACHIEVEMENTS:
            if achievement_data.title not in existing_titles:
                # Create a new Achievement entity from the default data
                new_achievement = Achievement(
                    title=achievement_data.title,
                    description=achievement_data.description,
                    value=achievement_data.value,
                    hidden=achievement_data.hidden,
                    is_global=getattr(achievement_data, 'is_global', True)  # Default to True for backward compatibility
                )
                new_achievements.append(new_achievement)
        
        if new_achievements:
            self.db.session.add_all(new_achievements)
            self.db.session.commit()
            logging.info(f"Initialized {len(new_achievements)} achievements")
        
        # Also update existing achievements if their data changed
        for achievement_data in ACHIEVEMENTS:
            existing = achievement_repository.by_title(achievement_data.title)
            if existing:
                # Update description, value, hidden status, and is_global flag if they differ
                is_global = getattr(achievement_data, 'is_global', True)
                if (existing.description != achievement_data.description or
                    existing.value != achievement_data.value or
                    existing.hidden != achievement_data.hidden or
                    existing.is_global != is_global):
                    existing.description = achievement_data.description
                    existing.value = achievement_data.value
                    existing.hidden = achievement_data.hidden
                    existing.is_global = is_global
                    self.db.session.commit()
                    logging.info(f"Updated achievement: {achievement_data.title}")
                if (existing.description != achievement_data.description or
                    existing.value != achievement_data.value or
                    existing.hidden != achievement_data.hidden):
                    existing.description = achievement_data.description
                    existing.value = achievement_data.value
                    existing.hidden = achievement_data.hidden
                    self.db.session.commit()
                    logging.info(f"Updated achievement: {achievement_data.title}")

    def init_logging(self):
        log_format_str = '%(asctime)s - %(levelname)s - p%(process)s - %(pathname)s:%(lineno)d - %(message)s'
        file_handler = logging.FileHandler("../raclotto-api.log")
        file_handler.setFormatter(
            logging.Formatter(log_format_str, "%d.%m.%y %H:%M:%S"))
        self.logger.addHandler(file_handler)

        self.logger.setLevel(logging.DEBUG)
        self.after_request(self.log_on_error)

    @staticmethod
    def page_not_found(_):
        from back.src.api.base_api import ApiError
        code = ApiErrorCode.endpoint_not_found
        error = ApiError(
            code,
            status=404,
            title="Not Found",
            detail="The requested endpoint does not exist"
        )
        return jsonify({
            "jsonapi": {"version": "1.0"},
            "errors": [error.to_dict()]
        }), 404

    def invalid_api_usage(self, e):
        return jsonify(e.to_dict()), e.status

    def uncaught_mikado_error(self, e):
        e = ApiError(e.args[0], title="Uncaught RaclottoError.", detail=str(e),
                     status=500)
        return jsonify(e.to_dict()), e.status
