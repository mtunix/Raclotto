import logging
from pathlib import Path
from typing import Type, Dict

from flask import Flask, Config, send_from_directory, Response, request, jsonify
from flask_restless import APIManager, Serializer
from flask_restless.serialization import Deserializer, DefaultDeserializer
from flask_restless.views.base import error_response
from flask_sqlalchemy import SQLAlchemy
from swagger_ui import api_doc

from back.src.driver.api_custom import apis_custom
from back.src.driver.api_generated import apis_generated
from back.src.driver.database import BaseModel
from back.src.driver.raclotto_api import ApiError, init_api_rules, ApiErrorCode
from back.src.utils import str_code_from_enum


class App(Flask):
    def __init__(
            self,
            name: str,
            db: SQLAlchemy,
            config: Type[Config]
    ):
        super().__init__(name)
        self.static_url_path = ""
        self.debug = True
        self.db = db
        self.config.from_object(config)
        self.db.init_app(self)

        with self.app_context() as app_context:
            self.db.create_all()
            app_context.push()

        self.manager = APIManager(self, session=db.session)
        self.init_restless()
        self.init_mikado_api()
        self.add_url_rule(rule='/', defaults={'path': ''}, view_func=self.serve, methods=['GET'])
        self.add_url_rule(rule='/<path:path>', view_func=self.serve, methods=['GET'])

        if self.config["DOCUMENTATION"]:
            api_doc(self, config_path='mikado_spec.json', url_prefix='/api/docs', title='Mikado API')

        self.init_logging()

        self.register_error_handler(ApiError, self.invalid_api_usage)
        self.register_error_handler(404, self.page_not_found)

    def serve(self, path):
        if path != "" and Path(f"{self.static_folder}/{path}").exists():
            return send_from_directory(self.static_folder, path)
        else:
            return send_from_directory(self.static_folder, 'index.html')

    def print_all_endpoints(self):
        """Can be useful for debugging and maybe for documentation"""
        for rule in self.url_map.iter_rules():
            logging.info([rule.rule, rule.methods])

    def get_serializers(self) -> Dict[BaseModel, Serializer]:
        serializers = {}
        for model in self.manager.created_apis_for:
            serializers[model] = self.manager.serializer_for(model)
        return serializers

    def get_deserializers(self) -> Dict[BaseModel, Deserializer]:
        """Seems to be easier to create new deserializers than to get the
        flask-restless once out of flask.
        """
        deserializers = {}
        for model in self.manager.created_apis_for:
            deserializer = DefaultDeserializer(self.db.session, model,
                                               self.manager)
            deserializers[self.manager.collection_name(model)] = deserializer
        return deserializers

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

    def init_restless(self):
        for model, methods, pre, post in apis_generated:
            self.manager.create_api(
                model,
                methods=methods,
                page_size=1000000,
                max_page_size=1000000,
                preprocessors=pre,
                postprocessors=post
        )

    def init_mikado_api(self):
        api_rules = init_api_rules(
            apis_custom,
            self.get_serializers(),
            self.get_deserializers(),
            self.db.session
        )
        self.register_blueprint(api_rules)

    def init_logging(self):
        log_format_str = '%(asctime)s - %(levelname)s - p%(process)s - %(pathname)s:%(lineno)d - %(message)s'
        file_handler = logging.FileHandler("../tb-api.log")
        file_handler.setFormatter(
            logging.Formatter(log_format_str, "%d.%m.%y %H:%M:%S"))
        self.logger.addHandler(file_handler)

        self.logger.setLevel(logging.DEBUG)
        self.after_request(self.log_on_error)

    @staticmethod
    def page_not_found(_):
        code = ApiErrorCode.endpoint_not_found
        return error_response(404, code=str_code_from_enum(code))

    def invalid_api_usage(self, e):
        return jsonify(e.to_dict()), e.status

    def uncaught_mikado_error(self, e):
        e = ApiError(e.args[0], title="Uncaught MikadoError.", detail=str(e),
                     status=500)
        return jsonify(e.to_dict()), e.status
