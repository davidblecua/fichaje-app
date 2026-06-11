"""
Schemas Pydantic v2 para validación de entrada/salida de la API.
"""

import os
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel, field_validator


def _tz() -> ZoneInfo:
    name = os.environ.get("APP_TIMEZONE", "Europe/Madrid")
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("Europe/Madrid")


def ahora_local() -> datetime:
    """Hora actual naive en la zona configurada."""
    return datetime.now(_tz()).replace(tzinfo=None)


def to_naive_local(v: datetime) -> datetime:
    """Convierte un datetime (aware o naive) a naive en la zona configurada."""
    if v.tzinfo is not None:
        return v.astimezone(_tz()).replace(tzinfo=None)
    return v


# ─── Schemas de entrada (request) ───────────────────────────────────────────

class FichajeEntradaCreate(BaseModel):
    """Datos opcionales al registrar una entrada."""
    entrada: Optional[datetime] = None   # Si None, se usa datetime.now()
    proyecto: Optional[str] = None
    cliente: Optional[str] = None
    tarea: Optional[str] = None
    tipo: str = "normal"
    notas: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in ("normal", "pausa"):
            raise ValueError("tipo debe ser 'normal' o 'pausa'")
        return v

    @field_validator("entrada")
    @classmethod
    def entrada_no_futura(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        v_local = to_naive_local(v)
        if v_local > ahora_local():
            raise ValueError("La hora de entrada no puede ser futura")
        return v_local


class FichajeSalidaCreate(BaseModel):
    """Datos opcionales al registrar una salida."""
    salida: Optional[datetime] = None    # Si None, se usa datetime.now()
    proyecto: Optional[str] = None
    cliente: Optional[str] = None
    tarea: Optional[str] = None
    facturado: bool = False
    notas: Optional[str] = None


class FichajeUpdate(BaseModel):
    """Campos editables de un fichaje (todos opcionales para PATCH)."""
    entrada: Optional[datetime] = None
    salida: Optional[datetime] = None
    proyecto: Optional[str] = None
    cliente: Optional[str] = None
    tarea: Optional[str] = None
    tipo: Optional[str] = None
    facturado: Optional[bool] = None
    notas: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("normal", "pausa"):
            raise ValueError("tipo debe ser 'normal' o 'pausa'")
        return v


# ─── Schemas de salida (response) ───────────────────────────────────────────

class FichajeResponse(BaseModel):
    """Representación completa de un fichaje para la API."""
    id: int
    entrada: datetime
    salida: Optional[datetime]
    horas: Optional[float]
    proyecto: Optional[str]
    cliente: Optional[str]
    tarea: Optional[str]
    tipo: str
    facturado: bool
    notas: Optional[str]
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class EstadoActual(BaseModel):
    """Estado actual del fichaje: si hay una entrada abierta."""
    trabajando: bool
    fichaje_activo: Optional[FichajeResponse] = None
    mensaje: str


class ListaFichajes(BaseModel):
    """Respuesta paginada de fichajes con total de horas."""
    fichajes: list[FichajeResponse]
    total_horas: float
    total_registros: int


class ProyectosResponse(BaseModel):
    """Lista de proyectos únicos para autocompletado."""
    proyectos: list[str]


class ClientesResponse(BaseModel):
    """Lista de clientes únicos para autocompletado."""
    clientes: list[str]


# ─── Schemas de gestión de clientes ─────────────────────────────────────────

class ClienteCreate(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre del cliente no puede estar vacío")
        return v.strip()


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    creado_en: datetime

    model_config = {"from_attributes": True}


# ─── Schemas de importación ──────────────────────────────────────────────────

class FichajeImport(BaseModel):
    """Un fichaje a importar. Solo entrada es obligatoria."""
    entrada: datetime
    salida: Optional[datetime] = None
    proyecto: Optional[str] = None
    cliente: Optional[str] = None
    tarea: Optional[str] = None
    tipo: str = "normal"
    facturado: bool = False
    notas: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in ("normal", "pausa"):
            raise ValueError("tipo debe ser 'normal' o 'pausa'")
        return v


class ImportResponse(BaseModel):
    importados: int
    errores: int
    detalle: list[str]


class ExportResponse(BaseModel):
    """Respuesta al exportar a Excel."""
    mensaje: str
    ruta: str
    hojas_generadas: list[str]
