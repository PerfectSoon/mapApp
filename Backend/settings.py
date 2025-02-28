from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    secret_key: str = 'SUPER_SECRET_KEY'
    algorithm: str = 'HS256'

    class Config:

        env_file = ".env"

settings = Settings()
