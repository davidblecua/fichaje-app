"""
Router de fichajes: endpoints para registrar entradas/salidas, consultar historial y editar registros.
"""

import logging
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database import get_db
from models import ClienteDB, Fichaje
from schemas import (
    ClientesResponse,
    EstadoActual,
    FichajeEntradaCreate,
    FichajeResponse,
    FichajeSalidaCreate,
    FichajeUpdate,
    ListaFichajes,
    ProyectosResponse,
    ahora_local,
    to_naive_local,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fichajes", tags=["fichajes"])


# ─── Helpers internos ───────────────────────────────────────────────────────

def _calcular_horas(entrada: datetime, salida: datetime) -> float:
    """Calcula la diferencia en horas con dos decimales."""
    delta = salida - entrada
    return round(delta.total_seconds() / 3600, 2)


def _obtener_fichaje_abierto(db: Session) -> Optional[Fichaje]:
    """Devuelve el registro de entrada sin salida, si existe."""
    return (
        db.query(Fichaje)
        .filter(Fichaje.salida.is_(None))
        .order_by(Fichaje.entrada.desc())
        .first()
    )


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/estado", response_model=EstadoActual)
def get_estado(db: Session = Depends(get_db)):
    """
    Devuelve el estado actual del fichaje.
    - trabajando=True si hay una entrada sin salida registrada.
    - Incluye los datos del fichaje activo si existe.
    """
    activo = _obtener_fichaje_abierto(db)

    if activo:
        return EstadoActual(
            trabajando=True,
            fichaje_activo=FichajeResponse.model_validate(activo),
            mensaje=f"Trabajando desde las {activo.entrada.strftime('%H:%M')}",
        )
    return EstadoActual(
        trabajando=False,
        fichaje_activo=None,
        mensaje="Sin fichar",
    )


@router.post("/entrada", response_model=FichajeResponse, status_code=201)
def registrar_entrada(datos: FichajeEntradaCreate, db: Session = Depends(get_db)):
    """
    Registra una nueva entrada de fichaje.
    Lanza error 409 si ya hay una entrada abierta sin cerrar.
    """
    # Verificar que no haya ya una entrada abierta
    abierto = _obtener_fichaje_abierto(db)
    if abierto:
        raise HTTPException(
            status_code=409,
            detail=f"Ya hay una entrada abierta desde las {abierto.entrada.strftime('%H:%M:%S')}. "
                   f"Registra la salida antes de fichar una nueva entrada.",
        )

    entrada_dt = datos.entrada or ahora_local()
    nuevo = Fichaje(
        entrada=entrada_dt,
        proyecto=datos.proyecto,
        cliente=datos.cliente,
        tarea=datos.tarea,
        tipo=datos.tipo,
        notas=datos.notas,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    logger.info("Entrada registrada: id=%d a las %s", nuevo.id, nuevo.entrada)
    return nuevo


@router.post("/salida", response_model=FichajeResponse)
def registrar_salida(datos: FichajeSalidaCreate, db: Session = Depends(get_db)):
    """
    Cierra el fichaje activo registrando la salida y calculando las horas trabajadas.
    Lanza error 404 si no hay ninguna entrada abierta.
    """
    abierto = _obtener_fichaje_abierto(db)
    if not abierto:
        raise HTTPException(
            status_code=404,
            detail="No hay ninguna entrada abierta para registrar la salida.",
        )

    ahora = to_naive_local(datos.salida) if datos.salida else ahora_local()
    if ahora <= abierto.entrada:
        raise HTTPException(
            status_code=422,
            detail="La hora de salida debe ser posterior a la entrada "
                   f"({abierto.entrada.strftime('%H:%M:%S')}).",
        )
    abierto.salida = ahora
    abierto.horas = _calcular_horas(abierto.entrada, ahora)
    abierto.actualizado_en = ahora_local()

    # Actualizar campos opcionales si se proporcionan en la salida
    if datos.proyecto is not None:
        abierto.proyecto = datos.proyecto
    if datos.cliente is not None:
        abierto.cliente = datos.cliente
    if datos.tarea is not None:
        abierto.tarea = datos.tarea
    if datos.notas is not None:
        abierto.notas = datos.notas
    abierto.facturado = datos.facturado

    db.commit()
    db.refresh(abierto)

    logger.info(
        "Salida registrada: id=%d a las %s (%.2f horas)",
        abierto.id, abierto.salida, abierto.horas
    )
    return abierto


@router.get("", response_model=ListaFichajes)
def listar_fichajes(
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio del filtro (YYYY-MM-DD)"),
    fecha_fin: Optional[date] = Query(None, description="Fecha fin del filtro (YYYY-MM-DD)"),
    proyecto: Optional[str] = Query(None, description="Filtrar por nombre de proyecto"),
    cliente: Optional[str] = Query(None, description="Filtrar por nombre de cliente"),
    facturado: Optional[bool] = Query(None, description="Filtrar por estado de facturación"),
    db: Session = Depends(get_db),
):
    """
    Lista fichajes con filtros opcionales.
    Por defecto devuelve los registros del mes actual.
    """
    query = db.query(Fichaje)

    # Aplicar filtros de fecha
    if fecha_inicio:
        inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
        query = query.filter(Fichaje.entrada >= inicio_dt)
    if fecha_fin:
        fin_dt = datetime.combine(fecha_fin, datetime.max.time())
        query = query.filter(Fichaje.entrada <= fin_dt)

    # Si no se especifica rango de fechas, mostrar el mes actual
    if not fecha_inicio and not fecha_fin:
        hoy = datetime.now()
        inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Fichaje.entrada >= inicio_mes)

    # Filtro por proyecto (búsqueda parcial, insensible a mayúsculas)
    if proyecto:
        query = query.filter(Fichaje.proyecto.ilike(f"%{proyecto}%"))

    # Filtro por cliente
    if cliente:
        query = query.filter(Fichaje.cliente.ilike(f"%{cliente}%"))

    # Filtro por estado de facturación
    if facturado is not None:
        query = query.filter(Fichaje.facturado == facturado)

    fichajes = query.order_by(Fichaje.entrada.desc()).all()

    # Calcular total de horas del período (solo registros cerrados)
    total_horas = round(
        sum(f.horas for f in fichajes if f.horas is not None), 2
    )

    return ListaFichajes(
        fichajes=[FichajeResponse.model_validate(f) for f in fichajes],
        total_horas=total_horas,
        total_registros=len(fichajes),
    )


@router.patch("/{fichaje_id}", response_model=FichajeResponse)
def editar_fichaje(
    fichaje_id: int,
    datos: FichajeUpdate,
    db: Session = Depends(get_db),
):
    """
    Edita parcialmente un registro de fichaje existente.
    Recalcula las horas si se modifican entrada o salida.
    """
    fichaje = db.query(Fichaje).filter(Fichaje.id == fichaje_id).first()
    if not fichaje:
        raise HTTPException(status_code=404, detail=f"Fichaje {fichaje_id} no encontrado.")

    # Actualizar solo los campos proporcionados
    campos = datos.model_dump(exclude_none=True)
    for campo, valor in campos.items():
        setattr(fichaje, campo, valor)

    # Recalcular horas si se han modificado los timestamps y ambos existen
    if ("entrada" in campos or "salida" in campos) and fichaje.salida:
        fichaje.horas = _calcular_horas(fichaje.entrada, fichaje.salida)

    fichaje.actualizado_en = ahora_local()
    db.commit()
    db.refresh(fichaje)

    logger.info("Fichaje id=%d actualizado", fichaje_id)
    return fichaje


@router.delete("/{fichaje_id}", status_code=204)
def eliminar_fichaje(fichaje_id: int, db: Session = Depends(get_db)):
    """Elimina un registro de fichaje por ID."""
    fichaje = db.query(Fichaje).filter(Fichaje.id == fichaje_id).first()
    if not fichaje:
        raise HTTPException(status_code=404, detail=f"Fichaje {fichaje_id} no encontrado.")

    db.delete(fichaje)
    db.commit()
    logger.info("Fichaje id=%d eliminado", fichaje_id)
    return None


# ─── Proyectos (para autocompletado) ────────────────────────────────────────

@router.get("/proyectos", response_model=ProyectosResponse)
def listar_proyectos(db: Session = Depends(get_db)):
    """
    Devuelve la lista de nombres de proyecto únicos registrados,
    ordenados alfabéticamente. Se usa para autocompletado en el frontend.
    """
    resultados = (
        db.query(Fichaje.proyecto)
        .filter(Fichaje.proyecto.isnot(None), Fichaje.proyecto != "")
        .distinct()
        .order_by(Fichaje.proyecto)
        .all()
    )
    proyectos = [r.proyecto for r in resultados if r.proyecto]
    return ProyectosResponse(proyectos=proyectos)


# ─── Clientes (para autocompletado) ─────────────────────────────────────────

@router.get("/clientes", response_model=ClientesResponse)
def listar_clientes(db: Session = Depends(get_db)):
    """
    Devuelve la lista de nombres de cliente únicos registrados,
    ordenados alfabéticamente. Se usa para autocompletado en el frontend.
    """
    del_catalogo = {
        r.nombre
        for r in db.query(ClienteDB.nombre).all()
        if r.nombre
    }
    de_fichajes = {
        r.cliente
        for r in db.query(Fichaje.cliente)
            .filter(Fichaje.cliente.isnot(None), Fichaje.cliente != "")
            .distinct()
            .all()
        if r.cliente
    }
    clientes = sorted(del_catalogo | de_fichajes)
    return ClientesResponse(clientes=clientes)
