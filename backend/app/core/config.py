import os
from urllib.parse import urlsplit


def get_cors_allowed_origins() -> list[str]:
    raw_value = os.getenv("CORS_ALLOWED_ORIGINS", "")
    origins = [
        origin.strip().rstrip("/") for origin in raw_value.split(",") if origin.strip()
    ]
    if not origins:
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must contain at least one trusted origin."
        )
    for origin in origins:
        parsed = urlsplit(origin)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or "*" in origin
        ):
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS must contain exact HTTP(S) origins without wildcards or paths."
            )
    return origins


def get_request_limit(path: str) -> int:
    env_name = (
        "MAX_WEBHOOK_BODY_BYTES"
        if path == "/webhooks/square"
        else "MAX_REQUEST_BODY_BYTES"
    )
    default = "262144" if path == "/webhooks/square" else "65536"
    raw_value = os.getenv(env_name, default)
    try:
        limit = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{env_name} must be an integer.") from exc
    if not 1024 <= limit <= 2_097_152:
        raise RuntimeError(f"{env_name} must be between 1024 and 2097152 bytes.")
    return limit
