from flask import Flask, request

from back.src.controller.api_controller import ApiController
from back.src.controller.ui_controller import UiController

app = Flask(__name__)
api = ApiController()
ui = UiController()


@app.route('/')
def index():
    return 'index'


@app.route('/api/ingredients/', methods=['GET', 'POST'])
def api_ingredients():
    if request.method == 'GET':
        session_id = request.args.get('session_id')
        if request.args.get('type'):
            return api.get_ingredients(session_id, request.args.get('type'))
        return api.get_ingredients(session_id)
    else:
        api.add_ingredient(request.json)


@app.route('/api/pans/', methods=['GET', 'POST'])
def api_pans():
    if request.method == 'GET':
        return api.get_pans(request.args.get('session_id'))
    else:
        api.add_pan(request.json)


@app.route('/api/ratings/', methods=['GET', 'POST'])
def api_ratings():
    if request.method == 'GET':
        return api.get_ratings(request.args.get('session_id'))
    else:
        api.add_rating(request.json)

