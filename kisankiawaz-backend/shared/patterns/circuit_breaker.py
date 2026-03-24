"""Circuit-breaker pattern for external service calls."""

import time
from enum import Enum
from typing import Any, Callable, Coroutine


class _State(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpen(Exception):
    """Raised when a call is attempted while the circuit is OPEN."""


class CircuitBreaker:
    """Async circuit breaker with configurable thresholds.

    Parameters
    ----------
    failure_threshold:
        Number of consecutive failures before opening the circuit.
    recovery_timeout:
        Seconds to wait in OPEN state before switching to HALF_OPEN.
    """

    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._state = _State.CLOSED
        self._failure_count: int = 0
        self._last_failure_time: float = 0.0

    @property
    def state(self) -> str:
        if self._state == _State.OPEN and self._should_attempt_reset():
            self._state = _State.HALF_OPEN
        return self._state.value

    async def call(self, func: Callable[..., Coroutine[Any, Any, Any]], *args: Any, **kwargs: Any) -> Any:
        """Execute *func* through the circuit breaker."""
        current = self.state  # triggers HALF_OPEN transition if needed

        if current == _State.OPEN.value:
            raise CircuitBreakerOpen(f"Circuit is OPEN (failures={self._failure_count})")

        try:
            result = await func(*args, **kwargs)
        except Exception as exc:
            self._record_failure()
            raise exc

        self._record_success()
        return result

    # ── internals ────────────────────────────────────────────────

    def _record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self.failure_threshold:
            self._state = _State.OPEN

    def _record_success(self) -> None:
        self._failure_count = 0
        self._state = _State.CLOSED

    def _should_attempt_reset(self) -> bool:
        return (time.monotonic() - self._last_failure_time) >= self.recovery_timeout
