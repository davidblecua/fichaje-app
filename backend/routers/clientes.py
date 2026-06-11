"""
Router de clientes: gestión del catálogo de clientes.
Los clientes se almacenan en tabla propia y se fusionan con los valores
distintos de fichajes.cliente para el autocompletado.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ClienteDB, Fichaje
from schemas import ClienteCreate, ClienteResponse, ClientesResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("", response_model=list[ClienteResponse])
def listar_clientes_crud(db: Session = Depends(get_db)):
    """Devuelve todos los clientes del catálogo con sus IDs."""
    return db.query(ClienteDB).order_by(ClienteDB.nombre).all()


@router.get("/autocomplete", response_model=ClientesResponse)
def autocompletar_clientes(db: Session = Depends(get_db)):
    """
    Devuelve nombres únicos de clientes para autocompletado.
    Fusiona la tabla clientes con los valores de fichajes.cliente.
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


@router.post("", response_model=ClienteResponse, status_code=201)
def crear_cliente(datos: ClienteCreate, db: Session = Depends(get_db)):
    """Añade un cliente al catálogo."""
    existente = db.query(ClienteDB).filter(ClienteDB.nombre == datos.nombre).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"El cliente '{datos.nombre}' ya existe.")
    cliente = ClienteDB(nombre=datos.nombre)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    logger.info("Cliente creado: %s", cliente.nombre)
    return cliente


@router.delete("/{cliente_id}", status_code=204)
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Elimina un cliente del catálogo (no afecta a fichajes existentes)."""
    cliente = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail=f"Cliente {cliente_id} no encontrado.")
    db.delete(cliente)
    db.commit()
    logger.info("Cliente eliminado: id=%d", cliente_id)
    return None
