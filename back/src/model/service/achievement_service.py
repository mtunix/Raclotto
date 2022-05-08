from back.src.model.domain.achievement import Achievement
from back.src.model.service.database_service import DatabaseService


class AchievementService(DatabaseService):
    def __init__(self):
        super().__init__(Achievement)

