from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# Con el pooler de Supabase en modo transacción (PgBouncer), psycopg3 no puede
# usar prepared statements del lado del servidor: las conexiones se reparten entre
# transacciones y aparece "prepared statement _pg3_x already exists / does not exist".
# prepare_threshold=None desactiva los prepared statements automáticos.
_connect_args: dict = {}
if settings.database_url.startswith("postgresql+psycopg"):
    _connect_args["prepare_threshold"] = None

engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
