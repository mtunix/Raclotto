from sqlalchemy import text

from back.src.api.base_api import BaseApi
from back.src.driver.database import db
from back.src.dto.health import HealthDto


class HealthApi(BaseApi):
    url_prefix = "/health"

    @BaseApi.endpoint("", ["GET"], response=HealthDto, operation_id="getHealth")
    def get_health(self) -> HealthDto:
        """Liveness for container and load-balancer checks: the app is up and its database answers."""
        db.session.execute(text("SELECT 1"))
        return HealthDto(status="ok")
