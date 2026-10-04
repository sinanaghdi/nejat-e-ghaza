from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.csrf import csrf_is_valid


class CSRFMiddleware(BaseHTTPMiddleware):
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
    EXEMPT_PATHS = {"/api/auth/register", "/api/auth/login", "/api/auth/csrf", "/api/payments/webhook"}

    async def dispatch(self, request, call_next):
        if request.method not in self.SAFE_METHODS and request.url.path not in self.EXEMPT_PATHS:
            auth_cookie = request.cookies.get(settings.auth_cookie_name)
            bearer_header = request.headers.get("Authorization", "")
            if auth_cookie and not bearer_header.startswith("Bearer ") and not csrf_is_valid(request):
                return JSONResponse(
                    {"detail": "CSRF token is missing or invalid"},
                    status_code=403,
                    headers={"Cache-Control": "no-store"},
                )

        return await call_next(request)
