import { useState } from "react";
import { useFichaje } from "./hooks/useFichaje";
import FichajeRapido from "./components/FichajeRapido";
import Historial from "./components/Historial";
import ExportButton from "./components/ExportButton";
import GestionClientes from "./components/GestionClientes";
import ImportarFichajes from "./components/ImportarFichajes";
import FichajeModal from "./components/FichajeModal";   // NEW
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
    crearFichajeManual,   // NEW
    exportar,
    aplicarFiltros,
    limpiarFiltros,
    cargarHistorial,
    cargarClientes: recargarClientes,
  } = useFichaje();

  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);       // NEW
  const [fichajeEditando, setFichajeEditando] = useState(null);  // NEW

  // NEW: Abre el modal en modo edición con el fichaje seleccionado
  const handleAbrirEdicion = (fichaje) => {
    setFichajeEditando(fichaje);
    setModalAbierto(true);
  };

  // NEW: Abre el modal en modo creación (sin fichaje)
  const handleAbrirCrear = () => {
    setFichajeEditando(null);
    setModalAbierto(true);
  };

  // NEW: Cierra el modal y limpia el estado
  const handleCerrarModal = () => {
    setModalAbierto(false);
    setFichajeEditando(null);
  };

  // NEW: Guarda los datos del modal (crea o edita según si hay fichajeEditando)
  const handleGuardarModal = async (datos) => {
    try {
      if (fichajeEditando) {
        await actualizarFichaje(fichajeEditando.id, datos);
      } else {
        await crearFichajeManual(datos);
      }
      handleCerrarModal();
    } catch {
      // El error ya se muestra mediante mostrarError en el hook
    }
  };

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
            {/* NEW: botón para abrir el modal de creación manual */}
            <button
              className={styles.btnHeaderSecundario}
              onClick={handleAbrirCrear}
              title="Añadir un fichaje manualmente"
            >
              + Añadir fichaje
            </button>
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
          onAbrirEdicion={handleAbrirEdicion}  // NEW: reemplaza onEditar
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
      {/* NEW: modal de creación y edición de fichajes */}
      <FichajeModal
        abierto={modalAbierto}
        fichaje={fichajeEditando}
        proyectos={proyectos}
        clientes={clientes}
        onGuardar={handleGuardarModal}
        onCerrar={handleCerrarModal}
      />
    </div>
  );
}
