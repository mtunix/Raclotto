"""Test-only endpoints exercising what no production endpoint declares yet."""

from back.src.api.base_api import BaseApi
from back.src.auth.middleware import require_auth
from back.src.dto.base import RequestDto, ResponseDto


class ProbeQuery(RequestDto):
    limit: int = 10
    tags: list[str] = []


class ProbeBody(RequestDto):
    name: str
    count: int


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
