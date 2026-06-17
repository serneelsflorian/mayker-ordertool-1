from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    debug: bool = False

    # SMTP transport settings — all optional; when smtp_host is empty (the
    # default) the LoggingEmailSender is used so the demo works without a
    # real mail server.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    email_from: str = "orders@ordertool.demo"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
