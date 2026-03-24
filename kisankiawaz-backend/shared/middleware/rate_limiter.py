"""Redis-based sliding-window rate limiter middleware."""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from shared.db.redis import get_redis
from shared.errors.codes import HttpStatus, ErrorCode

logger = logging.getLogger("kisankiawaz.ratelimit")


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter keyed on endpoint + client IP.

    Parameters
    ----------
    app:
        The ASGI application.
    max_requests:
        Maximum requests allowed within *window_seconds*.
    window_seconds:
        Length of the sliding window in seconds.
    """

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60) -> None:  # noqa: ANN001
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        endpoint = request.url.path
        key = f"rl:{endpoint}:{client_ip}"

        try:
            redis = await get_redis()
            now = time.time()
            window_start = now - self.window_seconds

            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, "-inf", window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, self.window_seconds)
            results = await pipe.execute()

            request_count: int = results[2]

            if request_count > self.max_requests:
                retry_after = str(self.window_seconds)
                logger.warning("Rate limited %s on %s (%d/%d)", client_ip, endpoint, request_count, self.max_requests)
                return JSONResponse(
                    status_code=HttpStatus.TOO_MANY_REQUESTS,
                    content={
                        "error": ErrorCode.RATE_LIMITED.value,
                        "detail": "Too many requests",
                    },
                    headers={"Retry-After": retry_after},
                )
        except Exception:
            # If Redis is down, allow the request through
            logger.warning("Rate limiter Redis error – allowing request", exc_info=True)

        return await call_next(request)
