from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CaePe Backend"
    database_url: str = "postgresql+psycopg://caepe:caepe@localhost:5432/caepe"

    # URL web pública usada para construir el link de invitación que se comparte
    # por WhatsApp. Debe ser un dominio real (https://...) que sirva la lectura
    # pública del evento, para que funcione aunque el invitado no tenga la app.
    public_web_url: str = "https://caepe.lat"

    # Orígenes permitidos por CORS (la página de invitación en caepe.lat llama al backend).
    # Coma-separado; "*" permite cualquiera.
    cors_origins: str = "https://caepe.lat,https://www.caepe.lat,http://localhost:3000,http://localhost:5173"

    # Monetización: tope de eventos creados (de por vida) en el plan free.
    free_event_limit: int = 5

    # --- Mercado Pago ---
    # En local usar las credenciales de PRUEBA (TEST-...); en prod las de producción.
    # Si mp_access_token está vacío, los endpoints de checkout responden 503.
    mp_access_token: str = ""
    mp_public_key: str = ""
    # "Clave secreta" del webhook (panel MP) para validar la firma x-signature.
    # Si está vacía, NO se valida firma (útil en local/sandbox).
    mp_webhook_secret: str = ""
    mp_currency: str = "PEN"
    # Sandbox usa sandbox_init_point en vez de init_point.
    mp_sandbox: bool = True

    # URL pública del backend (para notification_url del webhook MP).
    api_public_url: str = "https://caepe.onrender.com"

    # Premium: días que otorga un mes de premium y precio referencial.
    premium_days: int = 30

    # Referidos: días de premium que gana el referente por cada referido calificado,
    # y tope de premios por referente en una ventana móvil de 12 meses.
    referral_reward_days: int = 30
    referral_yearly_cap: int = 12

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
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

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
