import logging
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("statsaksham.workforce.database")


def _resolve_db():
    target_url = settings.DATABASE_URL
    # Normalize Postgres URL dialect
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif target_url.startswith("postgresql://") and not target_url.startswith("postgresql+"):
        target_url = target_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if settings.USE_SQLITE_FALLBACK or target_url.startswith("sqlite"):
        eng = create_engine(
            settings.SQLITE_FALLBACK_URL if settings.USE_SQLITE_FALLBACK else target_url,
            connect_args={"check_same_thread": False},
            echo=False
        )
        return eng, "sqlite", None

    try:
        eng = create_engine(
            target_url,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=300,
            pool_pre_ping=True,
            echo=False
        )
        # Test connection
        with eng.connect() as conn:
            conn.execute(text("SELECT 1;"))
        logger.info("P4 Workforce database connected to Supabase PostgreSQL (schema 'workforce').")
        return eng, "supabase", "workforce"
    except Exception as e:
        logger.warning(
            f"P4 Supabase connection failed ({e}). Activating fallback to local SQLite ({settings.SQLITE_FALLBACK_URL})."
        )
        eng = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False},
            echo=False
        )
        return eng, "sqlite_fallback", None


engine, db_backend, active_schema = _resolve_db()

metadata = MetaData(schema=active_schema) if active_schema else MetaData()
Base = declarative_base(metadata=metadata)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


def get_db():
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
