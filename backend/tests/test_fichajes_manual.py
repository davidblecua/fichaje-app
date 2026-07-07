"""Tests para el endpoint POST /fichajes (creación manual) y la validación salida > entrada en PATCH."""

import pytest
from datetime import datetime, timedelta


ENTRADA = "2024-06-10T09:00:00"
SALIDA = "2024-06-10T17:00:00"


def test_crear_fichaje_completo(client):
    """Crea un fichaje con todos los campos y verifica que se calculan las horas."""  # NEW
    r = client.post("/fichajes", json={
        "entrada": ENTRADA,
        "salida": SALIDA,
        "proyecto": "Web Acme",
        "cliente": "Acme S.L.",
        "tarea": "Diseño homepage",
        "tipo": "normal",
        "facturado": False,
        "notas": "Primera sesión",
    })
    assert r.status_code == 201  # NEW
    data = r.json()
    assert data["proyecto"] == "Web Acme"  # NEW
    assert data["horas"] == 8.0  # NEW  — 9:00 a 17:00 = 8 h
    assert data["salida"] is not None  # NEW


def test_crear_fichaje_solo_entrada(client):
    """Crea un fichaje sin salida; horas debe ser None."""  # NEW
    r = client.post("/fichajes", json={"entrada": ENTRADA})
    assert r.status_code == 201  # NEW
    data = r.json()
    assert data["salida"] is None  # NEW
    assert data["horas"] is None  # NEW


def test_crear_fichaje_salida_anterior_falla(client):
    """Rechaza con 422 si salida es anterior a entrada."""  # NEW
    r = client.post("/fichajes", json={
        "entrada": SALIDA,    # 17:00
        "salida": ENTRADA,    # 09:00 — anterior
    })
    assert r.status_code == 422  # NEW


def test_crear_fichaje_salida_igual_entrada_falla(client):
    """Rechaza con 422 si salida es igual a entrada."""  # NEW
    r = client.post("/fichajes", json={
        "entrada": ENTRADA,
        "salida": ENTRADA,
    })
    assert r.status_code == 422  # NEW


def test_crear_fichaje_tipo_invalido(client):
    """Rechaza con 422 si el tipo no es 'normal' ni 'pausa'."""  # NEW
    r = client.post("/fichajes", json={
        "entrada": ENTRADA,
        "tipo": "vacaciones",
    })
    assert r.status_code == 422  # NEW


def test_patch_salida_anterior_a_entrada_falla(client):
    """Rechaza con 422 si PATCH intenta dejar salida <= entrada."""  # NEW
    # Crear primero un fichaje cerrado válido
    r = client.post("/fichajes", json={"entrada": ENTRADA, "salida": SALIDA})
    assert r.status_code == 201
    fichaje_id = r.json()["id"]

    # Intentar cambiar la salida a una hora anterior a la entrada
    r2 = client.patch(f"/fichajes/{fichaje_id}", json={"salida": "2024-06-10T08:00:00"})
    assert r2.status_code == 422  # NEW
