"""Dynamic API key allocator with activity/load tracking and cooldown backoff."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List

from shared.core.config import get_settings


@dataclass
class KeyState:
    key_id: str
    key: str
    active_requests: int = 0
    total_requests: int = 0
    success_count: int = 0
    error_count: int = 0
    rate_limit_count: int = 0
    consecutive_rate_limits: int = 0
    cooldown_until: float = 0.0
    last_used_at: float = 0.0
    last_error: str = ""


@dataclass
class KeyLease:
    provider: str
    key_id: str
    key: str
    acquired_at: float = field(default_factory=time.time)


class ApiKeyAllocator:
    """Tracks provider key pools and allocates the least-loaded healthy key."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._settings = get_settings()
        self._pools: Dict[str, List[KeyState]] = {
            "gemini": self._build_pool("gemini", self._settings.gemini_api_keys_list),
            "groq": self._build_pool("groq", self._settings.groq_api_keys_list),
        }

    @staticmethod
    def _build_pool(provider: str, keys: List[str]) -> List[KeyState]:
        pool: List[KeyState] = []
        for idx, key in enumerate(keys, start=1):
            pool.append(KeyState(key_id=f"{provider}-{idx}", key=key))
        return pool

    def has_provider(self, provider: str) -> bool:
        with self._lock:
            return len(self._pools.get(provider, [])) > 0

    def acquire(self, provider: str) -> KeyLease:
        now = time.time()
        with self._lock:
            pool = self._pools.get(provider, [])
            if not pool:
                raise RuntimeError(f"No API keys configured for provider={provider}")

            ready = [k for k in pool if k.cooldown_until <= now]
            candidates = ready if ready else pool

            candidates.sort(
                key=lambda k: (
                    k.active_requests,
                    k.total_requests,
                    k.cooldown_until if k.cooldown_until > now else 0,
                    k.last_used_at,
                )
            )
            selected = candidates[0]
            selected.active_requests += 1
            selected.total_requests += 1
            selected.last_used_at = now
            return KeyLease(provider=provider, key_id=selected.key_id, key=selected.key)

    def report_success(self, lease: KeyLease) -> None:
        with self._lock:
            state = self._find_state(lease)
            if not state:
                return
            state.active_requests = max(0, state.active_requests - 1)
            state.success_count += 1
            state.consecutive_rate_limits = 0
            state.cooldown_until = 0.0
            state.last_error = ""

    def report_error(self, lease: KeyLease, error: str) -> None:
        with self._lock:
            state = self._find_state(lease)
            if not state:
                return
            state.active_requests = max(0, state.active_requests - 1)
            state.error_count += 1
            state.last_error = (error or "").strip()[:500]
            state.cooldown_until = max(state.cooldown_until, time.time() + self._settings.key_error_cooldown_seconds)

    def report_rate_limited(self, lease: KeyLease, error: str = "") -> None:
        now = time.time()
        with self._lock:
            state = self._find_state(lease)
            if not state:
                return
            state.active_requests = max(0, state.active_requests - 1)
            state.error_count += 1
            state.rate_limit_count += 1
            state.consecutive_rate_limits += 1
            backoff = min(
                self._settings.key_max_cooldown_seconds,
                self._settings.key_base_cooldown_seconds * (2 ** max(0, state.consecutive_rate_limits - 1)),
            )
            state.cooldown_until = max(state.cooldown_until, now + backoff)
            state.last_error = (error or "rate_limited").strip()[:500]

    def snapshot(self) -> dict:
        now = time.time()
        with self._lock:
            out: dict = {
                "generated_at_epoch": now,
                "providers": {},
            }
            for provider, pool in self._pools.items():
                out["providers"][provider] = {
                    "configured_keys": len(pool),
                    "keys": [
                        {
                            "key_id": k.key_id,
                            "active_requests": k.active_requests,
                            "total_requests": k.total_requests,
                            "success_count": k.success_count,
                            "error_count": k.error_count,
                            "rate_limit_count": k.rate_limit_count,
                            "consecutive_rate_limits": k.consecutive_rate_limits,
                            "cooldown_remaining_seconds": max(0.0, round(k.cooldown_until - now, 2)),
                            "last_used_at_epoch": k.last_used_at,
                            "last_error": k.last_error,
                        }
                        for k in pool
                    ],
                }
            return out

    def _find_state(self, lease: KeyLease) -> KeyState | None:
        pool = self._pools.get(lease.provider, [])
        for item in pool:
            if item.key_id == lease.key_id:
                return item
        return None


_allocator_singleton: ApiKeyAllocator | None = None
_allocator_lock = threading.Lock()


def get_api_key_allocator() -> ApiKeyAllocator:
    global _allocator_singleton
    with _allocator_lock:
        if _allocator_singleton is None:
            _allocator_singleton = ApiKeyAllocator()
        return _allocator_singleton
