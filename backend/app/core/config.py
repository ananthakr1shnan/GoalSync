from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    FRONTEND_URL: str = "http://localhost:5173"
    
    GMAIL_USER: str = "your_gmail_address@gmail.com"
    GMAIL_APP_PASSWORD: str = "your_16_char_app_password"
    GMAIL_FROM_NAME: str = "GoalSync Portal"
    EMAIL_ENABLED: bool = True
    ESCALATION_THRESHOLD_DAYS: int = 7
    ESCALATION_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

config = Settings()
