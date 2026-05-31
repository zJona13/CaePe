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

    # Push notifications (Expo). El backend hace POST a la API de Expo con el
    # ExpoPushToken del dispositivo. push_enabled=False desactiva el envío real
    # (útil en tests/local). expo_access_token es opcional (security de Expo).
    push_enabled: bool = True
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str = ""

    @property
    def jwt_algorithms_list(self) -> list[str]:
        return [a.strip() for a in self.supabase_jwt_algorithms.split(",") if a.strip()]


settings = Settings()
