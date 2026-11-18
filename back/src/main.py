from dotenv import load_dotenv

from back.src.driver.app import App
from back.src.driver.config import ConfigProduction
from back.src.driver.database import db

if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()

    api = App("raclotto-server", db, ConfigProduction)
    api.run(port=8081)
