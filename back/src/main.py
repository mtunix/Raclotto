"""Production server: the app configured from the environment (and `.env`), served by waitress."""

import os
from typing import Callable, Mapping

import waitress
from dotenv import load_dotenv

from back.src.driver.app import App
from back.src.driver.config import production_config
from back.src.driver.database import db


def create_app(environ: Mapping[str, str]) -> App:
    return App("raclotto-server", db, production_config(environ))


def serve(app: App, serve_with: Callable[..., None] = waitress.serve) -> None:
    serve_with(app, host=app.config["HOST"], port=app.config["PORT"])


if __name__ == "__main__":
    load_dotenv()
    serve(create_app(os.environ))
