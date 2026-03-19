from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "YouTube Labs API"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/youtubelabs"
    YOUTUBE_API_KEY: str = "" # To be provided by the user in .env

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
