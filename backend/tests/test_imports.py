"""Tests para el endpoint de importación de fichajes."""

from datetime import datetime, timezone


BASE_ENTRADA = "2025-01-15T09:00:00"
BASE_SALIDA  = "2025-01-15T17:30:00"


def test_importar_lista_vacia(client):
    r = client.post("/import/fichajes", json=[])
    assert r.status_code == 200
    assert r.json()["importados"] == 0
    assert r.json()["errores"] == 0


def test_importar_fichaje_basico(client):
    r = client.post("/import/fichajes", json=[{"entrada": BASE_ENTRADA}])
    assert r.status_code == 200
    assert r.json()["importados"] == 1
    assert r.json()["errores"] == 0


def test_importar_fichaje_completo(client):
    r = client.post("/import/fichajes", json=[{
        "entrada": BASE_ENTRADA,
        "salida": BASE_SALIDA,
        "proyecto": "Proyecto Importado",
        "cliente": "Cliente Importado",
        "tarea": "Tarea importada",
        "tipo": "normal",
        "facturado": True,
        "notas": "Test de importación",
    }])
    assert r.status_code == 200
    data = r.json()
    assert data["importados"] == 1
    assert data["errores"] == 0

    # Verificar que el fichaje aparece en historial (usar rango de fechas explícito)
    r2 = client.get("/fichajes?fecha_inicio=2025-01-01&fecha_fin=2025-01-31")
    fichs = r2.json()["fichajes"]
    importado = next((f for f in fichs if f["proyecto"] == "Proyecto Importado"), None)
    assert importado is not None
    assert importado["cliente"] == "Cliente Importado"
    assert importado["facturado"] is True
    assert importado["horas"] == 8.5


def test_importar_calcula_horas(client):
    r = client.post("/import/fichajes", json=[{
        "entrada": "2025-03-01T08:00:00",
        "salida": "2025-03-01T10:30:00",
    }])
    data = r.json()
    assert data["importados"] == 1
    r2 = client.get("/fichajes?fecha_inicio=2025-03-01&fecha_fin=2025-03-31")
    assert len(r2.json()["fichajes"]) == 1
    fich = r2.json()["fichajes"][0]
    assert fich["horas"] == 2.5


def test_importar_multiples_fichajes(client):
    payload = [
        {"entrada": f"2025-02-0{i}T09:00:00", "salida": f"2025-02-0{i}T17:00:00"}
        for i in range(1, 5)
    ]
    r = client.post("/import/fichajes", json=payload)
    assert r.json()["importados"] == 4
    assert r.json()["errores"] == 0


def test_importar_salida_anterior_a_entrada(client):
    r = client.post("/import/fichajes", json=[{
        "entrada": BASE_SALIDA,
        "salida": BASE_ENTRADA,  # salida antes que entrada
    }])
    data = r.json()
    assert data["importados"] == 0
    assert data["errores"] == 1
    assert len(data["detalle"]) == 1


def test_importar_mezcla_validos_e_invalidos(client):
    r = client.post("/import/fichajes", json=[
        {"entrada": BASE_ENTRADA, "salida": BASE_SALIDA},         # válido
        {"entrada": BASE_SALIDA, "salida": BASE_ENTRADA},         # inválido (salida < entrada)
        {"entrada": "2025-06-01T08:00:00"},                       # válido (sin salida)
    ])
    data = r.json()
    assert data["importados"] == 2
    assert data["errores"] == 1


def test_importar_tipo_invalido(client):
    r = client.post("/import/fichajes", json=[{
        "entrada": BASE_ENTRADA,
        "tipo": "invalido",
    }])
    assert r.status_code == 422
