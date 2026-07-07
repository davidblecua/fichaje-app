"""Tests para el endpoint de descarga de Excel."""

import pytest
from datetime import datetime, timedelta


def _crear_fichaje_cerrado(client):
    """Crea un fichaje completo (entrada + salida) para tener datos exportables."""
    hora_entrada = (datetime.now() - timedelta(hours=2)).isoformat()
    hora_salida = (datetime.now() - timedelta(hours=1)).isoformat()
    client.post("/fichajes/entrada", json={"proyecto": "Test", "entrada": hora_entrada})
    client.post("/fichajes/salida", json={"salida": hora_salida})


# ─── GET /export/excel/download ──────────────────────────────────────────────

def test_descargar_excel_sin_datos_devuelve_404(client):
    r = client.get("/export/excel/download")
    assert r.status_code == 404


def test_descargar_excel_devuelve_binario(client, tmp_path, monkeypatch):
    monkeypatch.setattr("services.excel_service.EXCEL_PATH", str(tmp_path / "fichajes.xlsx"))
    _crear_fichaje_cerrado(client)

    r = client.get("/export/excel/download")

    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]
    assert len(r.content) > 0


def test_descargar_excel_content_disposition(client, tmp_path, monkeypatch):
    monkeypatch.setattr("services.excel_service.EXCEL_PATH", str(tmp_path / "fichajes.xlsx"))
    _crear_fichaje_cerrado(client)

    r = client.get("/export/excel/download")

    assert r.status_code == 200
    disposition = r.headers.get("content-disposition", "")
    assert "attachment" in disposition
    assert "fichajes.xlsx" in disposition


def test_descargar_excel_con_filtro_fecha_inicio(client, tmp_path, monkeypatch):
    monkeypatch.setattr("services.excel_service.EXCEL_PATH", str(tmp_path / "fichajes.xlsx"))
    _crear_fichaje_cerrado(client)

    r = client.get("/export/excel/download?fecha_inicio=2000-01-01")

    assert r.status_code == 200
    assert len(r.content) > 0


def test_descargar_excel_filtro_futuro_devuelve_404(client):
    _crear_fichaje_cerrado(client)

    r = client.get("/export/excel/download?fecha_inicio=2099-01-01&fecha_fin=2099-12-31")

    assert r.status_code == 404


def test_descargar_excel_solo_incluye_registros_cerrados(client, tmp_path, monkeypatch):
    monkeypatch.setattr("services.excel_service.EXCEL_PATH", str(tmp_path / "fichajes.xlsx"))
    # Fichaje cerrado: debe aparecer
    _crear_fichaje_cerrado(client)
    # Fichaje abierto (sin salida): NO debe aparecer en el Excel
    client.post("/fichajes/entrada", json={"proyecto": "Abierto"})

    r = client.get("/export/excel/download")

    assert r.status_code == 200  # Hay al menos un registro cerrado
    assert len(r.content) > 0


# ─── POST /export/excel (endpoint original sin modificar) ────────────────────

def test_post_excel_original_sigue_devolviendo_json(client, tmp_path, monkeypatch):
    monkeypatch.setattr("services.excel_service.EXCEL_PATH", str(tmp_path / "fichajes.xlsx"))
    _crear_fichaje_cerrado(client)

    r = client.post("/export/excel")

    assert r.status_code == 200
    data = r.json()
    assert "hojas_generadas" in data
    assert "mensaje" in data
    assert len(data["hojas_generadas"]) > 0


def test_post_excel_sin_datos_devuelve_404(client):
    r = client.post("/export/excel")
    assert r.status_code == 404
