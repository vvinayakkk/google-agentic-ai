"""HTTP service client with built-in circuit-breaker support."""

from typing import Any, Optional

import httpx

from shared.patterns.circuit_breaker import CircuitBreaker


class ServiceClient:
    """Async HTTP client wrapping *httpx* with a circuit breaker.

    Parameters
    ----------
    base_url:
        Root URL of the target service (e.g. ``http://auth:8001``).
    timeout:
        Request timeout in seconds.
    failure_threshold:
        Circuit-breaker failure threshold.
    recovery_timeout:
        Circuit-breaker recovery timeout in seconds.
    """

    def __init__(
        self,
        base_url: str,
        timeout: float = 10.0,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=timeout)
        self._breaker = CircuitBreaker(failure_threshold, recovery_timeout)

    # ── public verbs ─────────────────────────────────────────────

    async def get(self, path: str, token: Optional[str] = None, **kwargs: Any) -> httpx.Response:
        """Perform a GET request through the circuit breaker."""
        return await self._request("GET", path, token=token, **kwargs)

    async def post(self, path: str, token: Optional[str] = None, **kwargs: Any) -> httpx.Response:
        """Perform a POST request through the circuit breaker."""
        return await self._request("POST", path, token=token, **kwargs)

    async def put(self, path: str, token: Optional[str] = None, **kwargs: Any) -> httpx.Response:
        """Perform a PUT request through the circuit breaker."""
        return await self._request("PUT", path, token=token, **kwargs)

    async def delete(self, path: str, token: Optional[str] = None, **kwargs: Any) -> httpx.Response:
        """Perform a DELETE request through the circuit breaker."""
        return await self._request("DELETE", path, token=token, **kwargs)

    # ── lifecycle ────────────────────────────────────────────────

    async def close(self) -> None:
        """Close the underlying httpx client."""
        await self._client.aclose()

    # ── internals ────────────────────────────────────────────────

    async def _request(self, method: str, path: str, token: Optional[str] = None, **kwargs: Any) -> httpx.Response:
        headers = kwargs.pop("headers", {})
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async def _do() -> httpx.Response:
            response = await self._client.request(method, path, headers=headers, **kwargs)
            response.raise_for_status()
            return response

        return await self._breaker.call(_do)
