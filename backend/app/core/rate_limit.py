from __future__ import annotations

import ipaddress
import os
import threading
import time
from collections import OrderedDict, deque
from dataclasses import dataclass

from fastapi import HTTPException, Request

DEFAULT_LIMITS = {
    "admin_login": "5/60",
    "checkout_creation": "10/60",
    "guest_order_lookup": "30/60",
    "guest_order_linking": "5/300",
}


@dataclass(frozen=True)
class RateLimit:
    requests: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self, max_buckets: int = 10_000) -> None:
        self._events: OrderedDict[str, deque[float]] = OrderedDict()
        self._max_buckets = max_buckets
        self._lock = threading.Lock()

    def check(self, key: str, limit: RateLimit, now: float | None = None) -> int | None:
        current_time = time.monotonic() if now is None else now
        cutoff = current_time - limit.window_seconds
        with self._lock:
            if key not in self._events and len(self._events) >= self._max_buckets:
                self._events.popitem(last=False)
            events = self._events.setdefault(key, deque())
            self._events.move_to_end(key)
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit.requests:
                return max(
                    1, int(limit.window_seconds - (current_time - events[0])) + 1
                )
            events.append(current_time)
        return None

    def clear(self) -> None:
        with self._lock:
            self._events.clear()


limiter = InMemoryRateLimiter()


def rate_limit(request: Request, scope: str, identifier: str | None = None) -> None:
    limit = get_rate_limit(scope)
    client_ip = get_client_ip(request)
    keys = [f"{scope}:ip:{client_ip}"]
    if identifier:
        keys.append(f"{scope}:identifier:{identifier}")
    for key in keys:
        retry_after = limiter.check(key, limit)
        if retry_after is not None:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )


def get_rate_limit(scope: str) -> RateLimit:
    if scope not in DEFAULT_LIMITS:
        raise RuntimeError(f"Unknown rate-limit scope: {scope}")
    env_name = f"RATE_LIMIT_{scope.upper()}"
    raw_value = os.getenv(env_name, DEFAULT_LIMITS[scope])
    try:
        requests_value, window_value = raw_value.split("/", maxsplit=1)
        parsed = RateLimit(
            requests=int(requests_value), window_seconds=int(window_value)
        )
    except (TypeError, ValueError) as exc:
        raise RuntimeError(
            f"{env_name} must use requests/window_seconds format."
        ) from exc
    if parsed.requests <= 0 or parsed.window_seconds <= 0:
        raise RuntimeError(f"{env_name} values must be positive.")
    return parsed


def get_client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    try:
        peer_ip = ipaddress.ip_address(peer)
    except ValueError:
        return peer

    trusted_networks = get_trusted_proxy_networks()
    if not any(peer_ip in network for network in trusted_networks):
        return peer_ip.compressed

    forwarded_for = request.headers.get("X-Forwarded-For", "")
    try:
        chain = [
            ipaddress.ip_address(value.strip())
            for value in forwarded_for.split(",")
            if value.strip()
        ]
    except ValueError:
        return peer_ip.compressed

    for candidate in reversed(chain):
        if not any(candidate in network for network in trusted_networks):
            return candidate.compressed
    return chain[0].compressed if chain else peer_ip.compressed


def get_trusted_proxy_networks() -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    raw_value = os.getenv("TRUSTED_PROXY_IPS", "")
    networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    for value in raw_value.split(","):
        cleaned = value.strip()
        if cleaned:
            try:
                networks.append(ipaddress.ip_network(cleaned, strict=False))
            except ValueError as exc:
                raise RuntimeError(
                    "TRUSTED_PROXY_IPS contains an invalid IP address or CIDR."
                ) from exc
    return networks
