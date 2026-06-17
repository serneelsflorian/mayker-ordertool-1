from typing import Literal

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
    # How to secure the SMTP connection:
    #   "starttls" — connect plaintext then upgrade (submission port 587; default)
    #   "tls"      — implicit TLS from connect (SMTPS port 465)
    #   "none"     — no encryption (local test servers such as MailHog on 1025)
    smtp_tls_mode: Literal["starttls", "tls", "none"] = "starttls"
    email_from: str = "orders@ordertool.demo"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
