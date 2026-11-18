from back.src.dto.base import ResponseDto


class AchievementDto(ResponseDto):
    # The columns are nullable, but every achievement is seeded from default_data with all of them set.
    id: int
    title: str
    description: str
    value: int
    hidden: bool
    is_global: bool
