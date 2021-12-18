import hashlib
from datetime import datetime

from back.src.model.domain.raclotto_session import RaclottoSession


def get_session():
    return RaclottoSession(
        key=hashlib.sha256(str(datetime.now()).encode("ASCII")).hexdigest()
    )


def get_session_const():
    stamp = datetime(year=2021, month=1, day=1, hour=0, minute=0, second=0)
    return RaclottoSession(
        key=hashlib.sha256(str(stamp).encode("ASCII")).hexdigest()
    )
