from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Nejat-e-Ghaza"
    environment: str = "development"
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    expose_legacy_access_token: bool = True
    auth_cookie_name: str = "nejat_e_ghaza_session"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"
    csrf_cookie_name: str = "nejat_e_ghaza_csrf"
    csrf_header_name: str = "X-CSRF-Token"
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    redis_url: str = "redis://localhost:6379/0"
    order_payment_timeout_minutes: int = 15
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    payment_webhook_secret: str = "change-me"
    payment_provider: str = "mock"
    payment_callback_url: str = "http://localhost:8000/api/payments/zarinpal/callback"
    frontend_payment_result_url: str = "http://localhost:5173/payment/result"
    payment_http_timeout_seconds: float = 10.0
    zarinpal_merchant_id: str | None = None
    zarinpal_sandbox: bool = True
    bootstrap_admin_name: str | None = None
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def frontend_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]

    def validate_production(self) -> None:
        if self.environment.lower() != "production":
            return

        errors: list[str] = []

        if self.expose_legacy_access_token:
            errors.append("EXPOSE_LEGACY_ACCESS_TOKEN must be false in production.")

        if not self.auth_cookie_secure:
            errors.append("AUTH_COOKIE_SECURE must be true in production.")

        if self.auth_cookie_samesite.lower() not in {"lax", "strict", "none"}:
            errors.append("AUTH_COOKIE_SAMESITE must be lax, strict, or none.")

        if self.auth_cookie_samesite.lower() == "none" and not self.auth_cookie_secure:
            errors.append("AUTH_COOKIE_SAMESITE=none requires AUTH_COOKIE_SECURE=true.")

        if len(self.jwt_secret_key.encode("utf-8")) < 32 or self.jwt_secret_key in {
            "test-secret",
            "REPLACE_WITH_A_LONG_RANDOM_SECRET",
        }:
            errors.append("JWT_SECRET_KEY must be a strong production secret of at least 32 UTF-8 bytes.")

        if len(self.payment_webhook_secret.encode("utf-8")) < 32 or self.payment_webhook_secret in {
            "change-me",
            "REPLACE_WITH_A_LONG_RANDOM_SECRET",
        }:
            errors.append("PAYMENT_WEBHOOK_SECRET must be a strong production secret of at least 32 UTF-8 bytes.")

        if not self.frontend_origin_list:
            errors.append("FRONTEND_ORIGINS must contain at least one HTTPS origin in production.")
        else:
            invalid_origins = [
                origin
                for origin in self.frontend_origin_list
                if urlparse(origin).scheme != "https" or not urlparse(origin).netloc
            ]
            if invalid_origins:
                errors.append("FRONTEND_ORIGINS must contain only valid HTTPS origins in production.")

        if self.database_url.lower().startswith("sqlite"):
            errors.append("DATABASE_URL must use PostgreSQL in production.")

        if "localhost" in self.redis_url or "127.0.0.1" in self.redis_url:
            errors.append("REDIS_URL must point to the production Redis service.")

        if self.payment_provider == "mock":
            errors.append("PAYMENT_PROVIDER=mock is not allowed in production.")

        if self.payment_provider == "zarinpal":
            if not self.zarinpal_merchant_id:
                errors.append("ZARINPAL_MERCHANT_ID is required when PAYMENT_PROVIDER=zarinpal.")
            if self.zarinpal_sandbox:
                errors.append("ZARINPAL_SANDBOX must be false in production.")
            if urlparse(self.payment_callback_url).scheme != "https":
                errors.append("PAYMENT_CALLBACK_URL must use HTTPS in production.")
            if urlparse(self.frontend_payment_result_url).scheme != "https":
                errors.append("FRONTEND_PAYMENT_RESULT_URL must use HTTPS in production.")

        if self.bootstrap_admin_password and (
            len(self.bootstrap_admin_password) < 12
            or self.bootstrap_admin_password == "REPLACE_WITH_A_STRONG_SECRET"
        ):
            errors.append("BOOTSTRAP_ADMIN_PASSWORD must be a strong secret when configured.")

        if errors:
            raise RuntimeError("Invalid production configuration: " + " ".join(errors))


settings = Settings()
