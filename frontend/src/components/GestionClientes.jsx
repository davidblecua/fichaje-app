import { useState, useEffect } from "react";
import { listarClientesCatalogo, crearCliente, eliminarCliente } from "../api/client";
import styles from "./GestionClientes.module.css";

export default function GestionClientes({ onCerrar, onCambio }) {
  const [clientes, setClientes] = useState([]);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    const data = await listarClientesCatalogo();
    setClientes(data);
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setCargando(true);
    setError(null);
    try {
      await crearCliente(nuevo.trim());
      setNuevo("");
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    setCargando(true);
    try {
      await eliminarCliente(id);
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>Gestionar clientes</h2>
          <button className={styles.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {error && <p className={styles.error}>⚠ {error}</p>}

        <form className={styles.form} onSubmit={handleCrear}>
          <input
            type="text"
            className={styles.input}
            placeholder="Nombre del nuevo cliente..."
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.btnAnadir} disabled={cargando || !nuevo.trim()}>
            + Añadir
          </button>
        </form>

        <ul className={styles.lista}>
          {clientes.length === 0 && (
            <li className={styles.vacio}>No hay clientes en el catálogo aún.</li>
          )}
          {clientes.map((c) => (
            <li key={c.id} className={styles.item}>
              <span className={styles.nombre}>{c.nombre}</span>
              <button
                className={styles.btnEliminar}
                onClick={() => handleEliminar(c.id)}
                disabled={cargando}
                title="Eliminar cliente del catálogo"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <p className={styles.nota}>
          Eliminar un cliente del catálogo no borra sus fichajes asociados.
        </p>
      </div>
    </div>
  );
}
