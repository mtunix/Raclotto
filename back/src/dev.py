"""Flask's development server with debugger and reloader, for `npm start` to proxy to.

Uses the production database and admin bootstrap with the dev JWT secret. Always binds to
127.0.0.1: the debugger runs arbitrary code for whoever reaches it.
"""

import os
from collections.abc import Callable, Mapping

from dotenv import load_dotenv

from back.src.driver.app import App
from back.src.driver.config import development_config
from back.src.driver.database import db


def create_app(environ: Mapping[str, str]) -> App:
    return App("raclotto-server", db, development_config(environ))


def serve(app: App, serve_with: Callable[..., None] = App.run) -> None:
    serve_with(app, host="127.0.0.1", port=app.config["PORT"])


if __name__ == "__main__":
    load_dotenv()
    serve(create_app(os.environ))
