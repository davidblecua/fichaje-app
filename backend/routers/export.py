"""
Router de exportación: endpoint para generar/actualizar el fichero Excel.
"""

import logging
from typing import Optional
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Fichaje
from schemas import ExportResponse
from services.excel_service import exportar_a_excel, EXCEL_PATH

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post("/excel", response_model=ExportResponse)
def exportar_excel(
    fecha_inicio: Optional[date] = Query(
        None,
        description="Exportar solo desde esta fecha (YYYY-MM-DD). "
                    "Sin filtro exporta todos los registros.",
    ),
    fecha_fin: Optional[date] = Query(
        None,
        description="Exportar solo hasta esta fecha (YYYY-MM-DD).",
    ),
    db: Session = Depends(get_db),
):
    """
    Genera o actualiza el fichero Excel en /app/data/fichajes.xlsx.
    - Crea una hoja por cada mes distinto en los datos.
    - Si el fichero ya existe, regenera las hojas afectadas.
    - Acepta filtros opcionales de fecha para exportar solo un rango.
    """
    query = db.query(Fichaje).filter(Fichaje.salida.isnot(None))  # Solo registros cerrados

    if fecha_inicio:
        inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
        query = query.filter(Fichaje.entrada >= inicio_dt)

    if fecha_fin:
        fin_dt = datetime.combine(fecha_fin, datetime.max.time())
        query = query.filter(Fichaje.entrada <= fin_dt)

    fichajes = query.order_by(Fichaje.entrada).all()

    if not fichajes:
        raise HTTPException(
            status_code=404,
            detail="No hay registros cerrados para exportar con los filtros indicados.",
        )

    try:
        ruta, hojas = exportar_a_excel(fichajes)
    except Exception as e:
        logger.error("Error al generar el Excel: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el fichero Excel: {str(e)}",
        )

    return ExportResponse(
        mensaje=f"Excel generado correctamente con {len(fichajes)} registros.",
        ruta=ruta,
        hojas_generadas=hojas,
    )


@router.get("/excel/download")
def descargar_excel(
    fecha_inicio: Optional[date] = Query(
        None,
        description="Exportar solo desde esta fecha (YYYY-MM-DD).",
    ),
    fecha_fin: Optional[date] = Query(
        None,
        description="Exportar solo hasta esta fecha (YYYY-MM-DD).",
    ),
    db: Session = Depends(get_db),
):
    """
    Genera el Excel y lo devuelve como descarga directa al navegador.
    El cliente elige dónde guardarlo mediante el diálogo del sistema operativo.
    """
    query = db.query(Fichaje).filter(Fichaje.salida.isnot(None))

    if fecha_inicio:
        inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
        query = query.filter(Fichaje.entrada >= inicio_dt)

    if fecha_fin:
        fin_dt = datetime.combine(fecha_fin, datetime.max.time())
        query = query.filter(Fichaje.entrada <= fin_dt)

    fichajes = query.order_by(Fichaje.entrada).all()

    if not fichajes:
        raise HTTPException(
            status_code=404,
            detail="No hay registros cerrados para exportar con los filtros indicados.",
        )

    try:
        ruta, _ = exportar_a_excel(fichajes)
    except Exception as e:
        logger.error("Error al generar el Excel para descarga: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el fichero Excel: {str(e)}",
        )

    return FileResponse(
        path=ruta,
        filename="fichajes.xlsx",
        media_type=EXCEL_MEDIA_TYPE,
    )
