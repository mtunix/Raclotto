from werkzeug.security import check_password_hash, generate_password_hash

# Checked when no account matches, so an unknown name answers as slowly as a wrong password.
_UNKNOWN_ACCOUNT_HASH = generate_password_hash("unknown account")


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Whether the password matches the hash; without a hash it is checked against a stand-in and fails."""
    if password_hash is None:
        check_password_hash(_UNKNOWN_ACCOUNT_HASH, password)
        return False
    return check_password_hash(password_hash, password)
