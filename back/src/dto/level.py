from back.src.dto.base import ResponseDto


class LevelDto(ResponseDto):
    id: int
    name: str
    label_en: str
    label_de: str
    required_experience: int
