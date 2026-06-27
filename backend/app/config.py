from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CaePe Backend"
    database_url: str = "postgresql+psycopg://caepe:caepe@localhost:5432/caepe"

    # URL web pública usada para construir el link de invitación que se comparte
    # por WhatsApp. Debe ser un dominio real (https://...) que sirva la lectura
    # pública del evento, para que funcione aunque el invitado no tenga la app.
    public_web_url: str = "https://caepe.lat"

    # Solo necesitas SUPABASE_URL y SUPABASE_JWT_SECRET en el .env.
    # El JWKS URL y el issuer se derivan de SUPABASE_URL (ver propiedades abajo).
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # Opcionales: solo cámbialos si necesitas sobreescribir los valores derivados.
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_algorithms: str = "HS256,RS256,ES256"
    supabase_jwt_leeway_seconds: int = 60
    supabase_jwks_url: str = ""  # vacío → se deriva de supabase_url
    supabase_jwt_issuer: str = ""  # vacío → se deriva de supabase_url

    # Push notifications (Expo). El backend hace POST a la API de Expo con el
    # ExpoPushToken del dispositivo. push_enabled=False desactiva el envío real
    # (útil en tests/local). expo_access_token es opcional (security de Expo).
    push_enabled: bool = True
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str = ""

    @property
    def jwt_algorithms_list(self) -> list[str]:
        return [a.strip() for a in self.supabase_jwt_algorithms.split(",") if a.strip()]

    @property
    def jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return ""

    @property
    def jwt_issuer(self) -> str:
        if self.supabase_jwt_issuer:
            return self.supabase_jwt_issuer
        if self.supabase_url:
            return f"{self.supabase_url.rstrip('/')}/auth/v1"
        return ""


settings = Settings()
