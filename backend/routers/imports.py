"""
Router de importación: permite importar fichajes en lote via JSON.
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Fichaje
from schemas import FichajeImport, ImportResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/import", tags=["import"])


@router.post("/fichajes", response_model=ImportResponse)
def importar_fichajes(fichajes: list[FichajeImport], db: Session = Depends(get_db)):
    """
    Importa una lista de fichajes en lote.
    Calcula horas automáticamente si hay entrada y salida.
    Devuelve un resumen de importados y errores.
    """
    importados = 0
    errores = 0
    detalle: list[str] = []

    for i, datos in enumerate(fichajes):
        try:
            horas = None
            if datos.salida:
                if datos.salida <= datos.entrada:
                    raise ValueError("salida debe ser posterior a entrada")
                delta = datos.salida - datos.entrada
                horas = round(delta.total_seconds() / 3600, 2)

            nuevo = Fichaje(
                entrada=datos.entrada,
                salida=datos.salida,
                horas=horas,
                proyecto=datos.proyecto,
                cliente=datos.cliente,
                tarea=datos.tarea,
                tipo=datos.tipo,
                facturado=datos.facturado,
                notas=datos.notas,
            )
            db.add(nuevo)
            db.flush()
            importados += 1
        except Exception as e:
            errores += 1
            detalle.append(f"Fila {i + 1}: {str(e)}")

    db.commit()
    logger.info("Importación: %d importados, %d errores", importados, errores)
    return ImportResponse(importados=importados, errores=errores, detalle=detalle)
