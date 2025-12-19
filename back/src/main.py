from back.src.driver.app import App
from back.src.driver.config import ConfigProduction
from back.src.driver.database import db
from back.test.util import DBTest

if __name__ == '__main__':
    api = App("raclotto-server", db, ConfigProduction)
    DBTest.insert_dummy_data(api.db)
    api.run(port=8081)
