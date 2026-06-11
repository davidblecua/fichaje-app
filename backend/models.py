"""
Modelos ORM de SQLAlchemy para la base de datos SQLite.
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from database import Base


class Fichaje(Base):
    """
    Registro de fichaje: representa un período de trabajo (entrada + salida opcional).
    Un registro con salida=None indica que el usuario está actualmente trabajando.
    """
    __tablename__ = "fichajes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Timestamps principales
    entrada = Column(DateTime, nullable=False, default=datetime.utcnow)
    salida = Column(DateTime, nullable=True)

    # Horas calculadas al registrar la salida (en horas decimales, ej: 1.5 = 1h 30min)
    horas = Column(Float, nullable=True)

    # Datos del proyecto/cliente
    proyecto = Column(String(200), nullable=True)
    cliente = Column(String(200), nullable=True)
    tarea = Column(Text, nullable=True)

    # Tipo de registro: "normal" o "pausa"
    tipo = Column(String(20), nullable=False, default="normal")

    # Si el trabajo ha sido facturado
    facturado = Column(Boolean, nullable=False, default=False)

    # Notas adicionales opcionales
    notas = Column(Text, nullable=True)

    # Metadatos de auditoría
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Fichaje id={self.id} entrada={self.entrada} salida={self.salida}>"


class ClienteDB(Base):
    """Catálogo de clientes para autocompletado y gestión independiente de fichajes."""
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(200), nullable=False, unique=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<ClienteDB id={self.id} nombre={self.nombre}>"
