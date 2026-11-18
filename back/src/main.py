"""Production server: the app configured from the environment (and `.env`), served by waitress."""

import logging
import os
from typing import Callable, Mapping

import waitress
from dotenv import load_dotenv

from back.src.driver.app import App
from back.src.driver.config import production_config
from back.src.driver.database import db
from back.src.version import current

# The headers Caddy sets: with them the app sees the client's address and the public scheme and host.
PROXY_HEADERS = {"x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"}


def create_app(environ: Mapping[str, str]) -> App:
    return App("raclotto-server", db, production_config(environ))


def serve(app: App, serve_with: Callable[..., None] = waitress.serve) -> None:
    # waitress logs "Serving on ..." at INFO; the root logger it sets up shows WARNING and up.
    logging.getLogger("waitress").setLevel(logging.INFO)
    options: dict[str, object] = {"host": app.config["HOST"], "port": app.config["PORT"]}
    if app.config["TRUSTED_PROXY"]:
        options.update(trusted_proxy=app.config["TRUSTED_PROXY"], trusted_proxy_headers=PROXY_HEADERS)
    app.logger.info("Raclotto %s", current())
    serve_with(app, **options)


if __name__ == "__main__":
    load_dotenv()
    serve(create_app(os.environ))
