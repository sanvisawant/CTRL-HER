import time
import logging
from functools import wraps
from typing import Generator, Callable, Any

from sqlalchemy import create_engine, exc
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from config import get_settings

logger = logging.getLogger("statsaksham.database")

settings = get_settings()

# Normalize database URL to use psycopg2 dialect explicitly if not specified
raw_url = settings.DATABASE_URL
if raw_url.startswith("postgres://"):
    db_url = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
    db_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    db_url = raw_url

# Configure resilient SQLAlchemy engine tailored for Supabase pooling (port 5432 / session pooler)
engine = create_engine(
    db_url,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=300,      # Recycle connections every 5 minutes to avoid idle drops
    pool_pre_ping=True,    # Test connections before checkout to drop stale pooled connections
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session.
    Automatically rolls back on unhandled exceptions and ensures session closure.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error encountered: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


def with_db_retry(max_retries: int = 3, base_delay: float = 0.5, backoff_factor: float = 2.0) -> Callable:
    """
    Decorator to wrap database operations with automatic exponential backoff retry
    to handle transient connection drops or pool timeouts on Supabase.
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            retries = 0
            delay = base_delay
            while True:
                try:
                    return func(*args, **kwargs)
                except (exc.OperationalError, exc.DatabaseError, exc.InterfaceError) as db_err:
                    retries += 1
                    if retries > max_retries:
                        logger.error(f"Exceeded max retries ({max_retries}) for DB operation: {func.__name__}. Error: {db_err}")
                        raise
                    logger.warning(
                        f"Database operational error in {func.__name__} (attempt {retries}/{max_retries}). "
                        f"Retrying in {delay:.2f}s... Error: {db_err}"
                    )
                    time.sleep(delay)
                    delay *= backoff_factor
        return wrapper
    return decorator
