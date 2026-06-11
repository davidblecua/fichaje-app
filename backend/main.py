"""
Punto de entrada principal de la API FastAPI.
Arranca con: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, Base
from routers import fichajes, export, clientes as clientes_router, imports as imports_router

# ─── Logging ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Inicialización de la base de datos ─────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea las tablas en SQLite al arrancar si no existen."""
    logger.info("Iniciando aplicación — creando tablas si es necesario...")
    Base.metadata.create_all(bind=engine)
    # Migración: añadir columna cliente si no existe (SQLite no soporta IF NOT EXISTS en ALTER TABLE)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE fichajes ADD COLUMN cliente VARCHAR(200)"))
            conn.commit()
            logger.info("Columna 'cliente' añadida a la tabla fichajes.")
        except Exception:
            pass  # La columna ya existe
    logger.info("Base de datos lista.")
    yield
    logger.info("Cerrando aplicación.")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Fichaje App API",
    description="API REST para gestión de fichajes personales de trabajo.",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── CORS ────────────────────────────────────────────────────────────────────

# Origins permitidos, configurable via variable de entorno
# Formato: string separado por comas, ej: "http://localhost:3000,http://192.168.1.10:3000"
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS habilitado para: %s", cors_origins)


# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(fichajes.router)
app.include_router(export.router)
app.include_router(clientes_router.router)
app.include_router(imports_router.router)


# ─── Health check ────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
def health_check():
    """Endpoint de health check para Docker y monitorización."""
    return {"status": "ok", "service": "fichaje-api"}


@app.get("/", tags=["health"])
def root():
    """Redirección informativa a la documentación."""
    return {
        "mensaje": "Fichaje App API",
        "docs": "/docs",
        "health": "/health",
    }
