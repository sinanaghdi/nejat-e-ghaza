import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.request_context import client_ip_context, request_id_context

logger = logging.getLogger("nejat_e_ghaza.http")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        client_ip = request.client.host if request.client else None

        request_token = request_id_context.set(request_id)
        ip_token = client_ip_context.set(client_ip)
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
            elapsed_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "%s %s status=%s duration_ms=%.2f",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_context.reset(request_token)
            client_ip_context.reset(ip_token)
