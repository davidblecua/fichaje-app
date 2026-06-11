"""Tests para los endpoints de gestión de clientes."""


def test_listar_clientes_vacio(client):
    r = client.get("/clientes")
    assert r.status_code == 200
    assert r.json() == []


def test_crear_cliente(client):
    r = client.post("/clientes", json={"nombre": "Empresa ABC"})
    assert r.status_code == 201
    data = r.json()
    assert data["nombre"] == "Empresa ABC"
    assert "id" in data


def test_crear_cliente_duplicado(client):
    client.post("/clientes", json={"nombre": "DuplicadoS.L."})
    r = client.post("/clientes", json={"nombre": "DuplicadoS.L."})
    assert r.status_code == 409


def test_crear_cliente_nombre_vacio(client):
    r = client.post("/clientes", json={"nombre": "   "})
    assert r.status_code == 422


def test_eliminar_cliente(client):
    r_c = client.post("/clientes", json={"nombre": "BorrarEsta"})
    cid = r_c.json()["id"]
    r = client.delete(f"/clientes/{cid}")
    assert r.status_code == 204
    r2 = client.get("/clientes")
    assert all(c["id"] != cid for c in r2.json())


def test_eliminar_cliente_inexistente(client):
    r = client.delete("/clientes/9999")
    assert r.status_code == 404


def test_autocomplete_incluye_catalogo_y_fichajes(client):
    # Crea un cliente en el catálogo
    client.post("/clientes", json={"nombre": "CatalogoCliente"})
    # Crea un fichaje con otro cliente (no en catálogo)
    client.post("/fichajes/entrada", json={"cliente": "FichajeCliente"})
    client.post("/fichajes/salida", json={})
    # El autocomplete debe incluir ambos
    r = client.get("/clientes/autocomplete")
    assert r.status_code == 200
    nombres = r.json()["clientes"]
    assert "CatalogoCliente" in nombres
    assert "FichajeCliente" in nombres


def test_listar_clientes_tras_crear_varios(client):
    client.post("/clientes", json={"nombre": "Cliente A"})
    client.post("/clientes", json={"nombre": "Cliente B"})
    r = client.get("/clientes")
    assert len(r.json()) == 2
