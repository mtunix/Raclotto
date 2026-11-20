"""Test-only endpoints exercising what no production endpoint declares yet."""

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.dto.base import RequestDto, ResponseDto
from back.src.entity.raclotto_session import RaclottoSession


class ProbeQuery(RequestDto):
    limit: int = 10
    tags: list[str] = []


class ProbeBody(RequestDto):
    name: str
    count: int


class ProbeKey(RequestDto):
    key: str


class ProbeDto(ResponseDto):
    name: str
    count: int
    limit: int
    tags: list[str]


class ProbeApi(BaseApi):
    url_prefix = "/probe"

    @BaseApi.endpoint("/echo", ["POST"], query=ProbeQuery, body=ProbeBody, response=ProbeDto, status=201)
    def echo(self, query: ProbeQuery, body: ProbeBody) -> ProbeDto:
        """Echo the body and query."""
        return ProbeDto(name=body.name, count=body.count, limit=query.limit, tags=query.tags)

    @BaseApi.endpoint("/secure", ["POST"], body=ProbeBody, response=ProbeDto)
    @require_auth
    def secure_echo(self, body: ProbeBody) -> ProbeDto:
        return ProbeDto(name=body.name, count=body.count, limit=0, tags=[])

    @BaseApi.endpoint("/untyped-result", ["GET"], response=ProbeDto)
    def untyped_result(self):
        return {"name": "x", "count": 1, "limit": 0, "tags": []}

    @BaseApi.endpoint("/crash", ["GET"], response=ProbeDto)
    def crash(self) -> ProbeDto:
        raise RuntimeError("secret internals")

    @BaseApi.endpoint("/<int:probe_id>", ["DELETE"], status=204)
    def delete_probe(self, probe_id: int) -> None:
        return None

    @BaseApi.endpoint("/sessions", ["POST"], body=ProbeKey, response=ProbeDto)
    def write(self, body: ProbeKey) -> ProbeDto:
        _add_session(body.key)
        return ProbeDto(name=body.key, count=1, limit=0, tags=[])

    @BaseApi.endpoint("/sessions/failing", ["POST"], body=ProbeKey, status=204, errors=(409,))
    def write_then_fail(self, body: ProbeKey) -> None:
        _add_session(body.key)
        raise ApiError(ApiErrorCode.conflict, status=409, title="Conflict")

    @BaseApi.endpoint("/sessions", ["GET"], query=ProbeKey, response=ProbeDto)
    def write_on_read(self, query: ProbeKey) -> ProbeDto:
        _add_session(query.key)
        return ProbeDto(name=query.key, count=1, limit=0, tags=[])


def _add_session(key: str) -> None:
    db.session.add(RaclottoSession(key=key, name=key))
    db.session.flush()
