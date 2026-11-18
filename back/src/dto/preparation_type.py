from back.src.dto.base import ResponseDto


class PrepTypeDto(ResponseDto):
    id: int
    name: str
    # Null for the default types every session offers.
    session_id: int | None
