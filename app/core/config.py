from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Nejat-e-Ghaza"
    environment: str = "development"
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    redis_url: str = "redis://localhost:6379/0"
    order_payment_timeout_minutes: int = 15
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    payment_webhook_secret: str = "change-me"
    payment_provider: str = "mock"
    payment_callback_url: str = "http://localhost:8000/api/payments/zarinpal/callback"
    payment_http_timeout_seconds: float = 10.0
    zarinpal_merchant_id: str | None = None
    zarinpal_sandbox: bool = True
    bootstrap_admin_name: str | None = None
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def frontend_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
