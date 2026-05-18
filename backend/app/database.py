from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import config

# Need to replace postgresql:// with postgresql+psycopg2:// for SQLAlchemy if using psycopg2 directly
# Though SQLAlchemy 2.0 supports postgresql:// with psycopg2 by default if psycopg2 is the default driver.
SQLALCHEMY_DATABASE_URL = config.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
