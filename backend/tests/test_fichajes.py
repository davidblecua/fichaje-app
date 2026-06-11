"""Tests para los endpoints de fichajes."""

import pytest
from datetime import datetime, timedelta


def test_get_estado_sin_fichar(client):
    r = client.get("/fichajes/estado")
    assert r.status_code == 200
    assert r.json()["trabajando"] is False
    assert r.json()["fichaje_activo"] is None


def test_registrar_entrada(client):
    r = client.post("/fichajes/entrada", json={})
    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert data["salida"] is None


def test_registrar_entrada_con_detalle(client):
    r = client.post("/fichajes/entrada", json={
        "proyecto": "Web Acme",
        "cliente": "Acme S.L.",
        "tarea": "Diseño homepage",
        "tipo": "normal",
        "notas": "Primera tarea",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["proyecto"] == "Web Acme"
    assert data["cliente"] == "Acme S.L."
    assert data["tarea"] == "Diseño homepage"


def test_registrar_entrada_duplicada(client):
    client.post("/fichajes/entrada", json={})
    r = client.post("/fichajes/entrada", json={})
    assert r.status_code == 409


def test_estado_trabajando_tras_entrada(client):
    client.post("/fichajes/entrada", json={})
    r = client.get("/fichajes/estado")
    assert r.json()["trabajando"] is True
    assert r.json()["fichaje_activo"] is not None


def test_registrar_salida(client):
    client.post("/fichajes/entrada", json={})
    r = client.post("/fichajes/salida", json={"facturado": False})
    assert r.status_code == 200
    data = r.json()
    assert data["salida"] is not None
    assert data["horas"] is not None
    assert data["horas"] >= 0


def test_registrar_salida_sin_entrada(client):
    r = client.post("/fichajes/salida", json={})
    assert r.status_code == 404


def test_estado_libre_tras_salida(client):
    client.post("/fichajes/entrada", json={})
    client.post("/fichajes/salida", json={})
    r = client.get("/fichajes/estado")
    assert r.json()["trabajando"] is False


def test_listar_fichajes_vacio(client):
    r = client.get("/fichajes")
    assert r.status_code == 200
    data = r.json()
    assert data["fichajes"] == []
    assert data["total_horas"] == 0


def test_listar_fichajes_con_datos(client):
    client.post("/fichajes/entrada", json={"proyecto": "P1", "cliente": "C1"})
    client.post("/fichajes/salida", json={})
    r = client.get("/fichajes")
    data = r.json()
    assert data["total_registros"] >= 1
    assert data["fichajes"][0]["proyecto"] == "P1"
    assert data["fichajes"][0]["cliente"] == "C1"


def test_filtro_por_proyecto(client):
    client.post("/fichajes/entrada", json={"proyecto": "Alpha"})
    client.post("/fichajes/salida", json={})
    r = client.get("/fichajes?proyecto=Alpha")
    assert r.json()["total_registros"] >= 1
    r2 = client.get("/fichajes?proyecto=NonExistent")
    assert r2.json()["total_registros"] == 0


def test_filtro_por_cliente(client):
    client.post("/fichajes/entrada", json={"cliente": "ClienteX"})
    client.post("/fichajes/salida", json={})
    r = client.get("/fichajes?cliente=ClienteX")
    assert r.json()["total_registros"] >= 1
    r2 = client.get("/fichajes?cliente=Inexistente")
    assert r2.json()["total_registros"] == 0


def test_filtro_por_facturado(client):
    client.post("/fichajes/entrada", json={})
    client.post("/fichajes/salida", json={"facturado": True})
    r = client.get("/fichajes?facturado=true")
    assert r.json()["total_registros"] >= 1
    r2 = client.get("/fichajes?facturado=false")
    assert r2.json()["total_registros"] == 0


def test_editar_fichaje(client):
    r_in = client.post("/fichajes/entrada", json={})
    fid = r_in.json()["id"]
    r = client.patch(f"/fichajes/{fid}", json={"proyecto": "Nuevo"})
    assert r.status_code == 200
    assert r.json()["proyecto"] == "Nuevo"


def test_editar_fichaje_inexistente(client):
    r = client.patch("/fichajes/9999", json={"proyecto": "X"})
    assert r.status_code == 404


def test_eliminar_fichaje(client):
    r_in = client.post("/fichajes/entrada", json={})
    fid = r_in.json()["id"]
    r = client.delete(f"/fichajes/{fid}")
    assert r.status_code == 204
    r2 = client.get("/fichajes")
    assert all(f["id"] != fid for f in r2.json()["fichajes"])


def test_eliminar_fichaje_inexistente(client):
    r = client.delete("/fichajes/9999")
    assert r.status_code == 404


def test_listar_proyectos(client):
    client.post("/fichajes/entrada", json={"proyecto": "ProyectoTest"})
    client.post("/fichajes/salida", json={})
    r = client.get("/fichajes/proyectos")
    assert r.status_code == 200
    assert "ProyectoTest" in r.json()["proyectos"]


def test_entrada_con_hora_pasada(client):
    hora_pasada = (datetime.now() - timedelta(hours=2)).isoformat()
    r = client.post("/fichajes/entrada", json={"entrada": hora_pasada})
    assert r.status_code == 201
    entrada_registrada = datetime.fromisoformat(r.json()["entrada"])
    diferencia = abs((datetime.now() - timedelta(hours=2)) - entrada_registrada)
    assert diferencia.total_seconds() < 60


def test_entrada_con_hora_futura_rechazada(client):
    hora_futura = (datetime.now() + timedelta(hours=1)).isoformat()
    r = client.post("/fichajes/entrada", json={"entrada": hora_futura})
    assert r.status_code == 422


def test_salida_con_hora_pasada(client):
    hora_entrada = (datetime.now() - timedelta(hours=3)).isoformat()
    hora_salida  = (datetime.now() - timedelta(hours=1)).isoformat()
    client.post("/fichajes/entrada", json={"entrada": hora_entrada})
    r = client.post("/fichajes/salida", json={"salida": hora_salida})
    assert r.status_code == 200
    assert r.json()["horas"] == pytest.approx(2.0, abs=0.05)


def test_salida_anterior_a_entrada_rechazada(client):
    hora_entrada = (datetime.now() - timedelta(hours=1)).isoformat()
    hora_salida  = (datetime.now() - timedelta(hours=2)).isoformat()
    client.post("/fichajes/entrada", json={"entrada": hora_entrada})
    r = client.post("/fichajes/salida", json={"salida": hora_salida})
    assert r.status_code == 422


def test_listar_clientes_autocomplete(client):
    client.post("/fichajes/entrada", json={"cliente": "ClienteAuto"})
    client.post("/fichajes/salida", json={})
    r = client.get("/fichajes/clientes")
    assert r.status_code == 200
    assert "ClienteAuto" in r.json()["clientes"]
