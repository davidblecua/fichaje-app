import { useState } from "react";
import { useFichaje } from "./hooks/useFichaje";
import FichajeRapido from "./components/FichajeRapido";
import Historial from "./components/Historial";
import ExportButton from "./components/ExportButton";
import GestionClientes from "./components/GestionClientes";
import ImportarFichajes from "./components/ImportarFichajes";
import styles from "./App.module.css";

export default function App() {
  const {
    estado,
    fichajes,
    totalHoras,
    proyectos,
    clientes,
    cargando,
    cargandoHistorial,
    error,
    exito,
    filtros,
    ficharEntrada,
    ficharSalida,
    actualizarFichaje,
    borrarFichaje,
    exportar,
    aplicarFiltros,
    limpiarFiltros,
    cargarHistorial,
    cargarClientes: recargarClientes,
  } = useFichaje();

  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarImportar, setMostrarImportar] = useState(false);

  return (
    <div className={styles.app}>
      {/* ─── Cabecera ──────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🕐</span>
            <span className={styles.logoTexto}>Fichaje</span>
          </div>
          <div className={styles.headerAcciones}>
            <button
              className={styles.btnHeaderSecundario}
              onClick={() => setMostrarImportar(true)}
              title="Importar fichajes desde JSON"
            >
              ⬆ Importar
            </button>
            <button
              className={styles.btnHeaderSecundario}
              onClick={() => setMostrarClientes(true)}
              title="Gestionar catálogo de clientes"
            >
              👤 Clientes
            </button>
            <ExportButton onExportar={exportar} cargando={cargando} />
          </div>
        </div>
      </header>

      {/* ─── Notificaciones ────────────────────────────────────────────── */}
      <div className={styles.notificaciones}>
        {error && (
          <div className={`${styles.notif} ${styles.notifError}`} role="alert">
            ⚠ {error}
          </div>
        )}
        {exito && (
          <div className={`${styles.notif} ${styles.notifExito}`} role="status">
            ✓ {exito}
          </div>
        )}
      </div>

      {/* ─── Contenido principal ───────────────────────────────────────── */}
      <main className={styles.main}>
        <FichajeRapido
          estado={estado}
          cargando={cargando}
          proyectos={proyectos}
          clientes={clientes}
          onEntrada={ficharEntrada}
          onSalida={ficharSalida}
        />

        <Historial
          fichajes={fichajes}
          totalHoras={totalHoras}
          cargando={cargandoHistorial}
          filtros={filtros}
          proyectos={proyectos}
          clientes={clientes}
          onFiltrar={aplicarFiltros}
          onLimpiarFiltros={limpiarFiltros}
          onEditar={actualizarFichaje}
          onEliminar={borrarFichaje}
        />
      </main>

      {/* ─── Pie de página ─────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <span>Fichaje App · Uso personal</span>
      </footer>

      {/* ─── Modales ───────────────────────────────────────────────────── */}
      {mostrarClientes && (
        <GestionClientes
          onCerrar={() => setMostrarClientes(false)}
          onCambio={recargarClientes}
        />
      )}
      {mostrarImportar && (
        <ImportarFichajes
          onCerrar={() => setMostrarImportar(false)}
          onImportado={() => { cargarHistorial(); recargarClientes?.(); }}
        />
      )}
    </div>
  );
}
