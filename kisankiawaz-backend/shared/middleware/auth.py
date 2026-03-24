"""Auth dependency alias – convenience shortcut for FastAPI route signatures.

Usage::

    from shared.middleware.auth import require_auth

    @router.get("/protected")
    async def protected(user: dict = require_auth):
        ...
"""

from fastapi import Depends

from shared.auth.deps import get_current_user

# A ready-made FastAPI Depends object so routes can write:
#   _user: dict = require_auth
# instead of the more verbose Depends(get_current_user).
require_auth = Depends(get_current_user)
