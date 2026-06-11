"""
Fixtures compartidos para todos los tests.
Usa una base de datos SQLite en memoria para aislar cada test.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # Asegura que todos los modelos estén registrados en Base
from database import Base, get_db
from main import app

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def client():
    """
    TestClient con base de datos SQLite en memoria inyectada.
    StaticPool garantiza que todas las conexiones comparten la misma DB.
    """
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_get_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
