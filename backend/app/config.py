from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CaePe Backend"
    database_url: str = "postgresql+psycopg://caepe:caepe@localhost:5432/caepe"

    supabase_url: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_issuer: str = ""
    supabase_jwt_algorithms: str = "HS256,RS256,ES256"
    supabase_jwt_secret: str = ""
    supabase_jwt_leeway_seconds: int = 60

    # Google Vision OCR for proof validation. When enabled, uploaded receipts must
    # contain 'yape' or 'plin' tokens to be accepted.
    google_vision_enabled: bool = False
    google_vision_api_key: str = ""

    @property
    def jwt_algorithms_list(self) -> list[str]:
        return [a.strip() for a in self.supabase_jwt_algorithms.split(",") if a.strip()]


settings = Settings()
