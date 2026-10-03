from contextvars import ContextVar

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)
client_ip_context: ContextVar[str | None] = ContextVar("client_ip", default=None)


def get_request_id() -> str | None:
    return request_id_context.get()


def get_client_ip() -> str | None:
    return client_ip_context.get()
