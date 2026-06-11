"""
Configuración de la base de datos SQLite con SQLAlchemy.
El fichero .db se guarda en /app/data para persistencia via volumen Docker.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL de base de datos, configurable via variable de entorno
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////app/data/fichajes.db")

# Para SQLite, necesitamos check_same_thread=False en entornos multithread
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,  # Poner True para ver SQL en logs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency de FastAPI para obtener una sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
