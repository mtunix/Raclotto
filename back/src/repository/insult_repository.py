from back.src.repository.base_repository import BaseRepository
from back.src.entity.insult import Insult


class InsultRepository(BaseRepository[Insult]):
    """Repository for Insult entities."""
    
    def __init__(self):
        super().__init__(Insult)
