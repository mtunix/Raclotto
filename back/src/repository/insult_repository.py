from back.src.entity.insult import Insult
from back.src.repository.base_repository import BaseRepository


class InsultRepository(BaseRepository[Insult]):
    """Repository for Insult entities."""

    def __init__(self) -> None:
        super().__init__(Insult)
