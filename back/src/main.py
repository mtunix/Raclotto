from flask import Flask, request, render_template
from flask_cors import CORS

from back.src.controller.api_controller import ApiController
from back.src.controller.ui_controller import UiController

app = Flask(__name__, static_folder="build/static", template_folder="build")
CORS(app)
api = ApiController()
ui = UiController()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate/", methods=["POST"])
def api_generate():
    res = api.generate(request.json)

    return app.response_class(
        response=res,
        status=200,
        mimetype="application/json"
    )


@app.route("/api/sessions/validate/", methods=["GET"])
def api_sessions_validate():
    session_key = request.args.get("session_key")
    res = api.validate(session_key)

    return app.response_class(
        response=res,
        status=200,
        mimetype="application/json"
    )


@app.route("/api/sessions/create/", methods=["POST"])
def api_sessions_create():
    res = api.add_session(request.json)

    return app.response_class(
        response=res,
        status=200,
        mimetype="application/json"
    )


@app.route("/api/sessions/", methods=["GET", "POST"])
def api_sessions():
    if request.method == "GET":
        res = api.get_sessions()
        return app.response_class(
            response=res,
            status=200,
            mimetype="application/json"
        )
    else:
        pass


@app.route("/api/ingredients/", methods=["GET", "POST"])
def api_ingredients():
    if request.method == "GET":
        session_id = request.args.get("session_key")
        if request.args.get("type"):
            res = api.get_ingredients(session_id, request.args.get("type"))
        else:
            res = api.get_ingredients(session_id)
    else:
        res = api.add_ingredient(request.json)

    return app.response_class(
        response=res,
        status=200,
        mimetype="application/json"
    )


@app.route("/api/ingredients/delete/", methods=["GET"])
def api_ingredients_remove():
    session_id = request.args.get("session_key")
    res = api.del_ingredient(session_id, request.args.get("id"))

    return app.response_class(
        response=res,
        status=200,
        mimetype="application/json"
    )


@app.route("/api/pans/", methods=["GET", "POST"])
def api_pans():
    if request.method == "GET":
        res = api.get_pans(request.args.get("session_key"))
        return app.response_class(
            response=res,
            status=200,
            mimetype="application/json"
        )
    else:
        api.add_pan(request.json)


@app.route("/api/ratings/", methods=["GET", "POST"])
def api_ratings():
    if request.method == "GET":
        return api.get_ratings(request.args.get("session_key"))
    else:
        api.add_rating(request.json)

