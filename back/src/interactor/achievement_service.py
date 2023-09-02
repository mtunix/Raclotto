from back.src.entity.achievement import Achievement
from back.src.interactor.database_service import DatabaseService


class AchievementService(DatabaseService):
    def __init__(self):
        super().__init__(Achievement)

