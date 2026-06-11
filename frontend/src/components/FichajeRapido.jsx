/**
 * Componente de fichaje rápido: muestra el estado actual y los botones de entrada/salida.
 * Sin lógica de negocio — solo UI y callbacks del hook.
 */

import { useState } from "react";
import FichajeDetalle from "./FichajeDetalle";
import styles from "./FichajeRapido.module.css";

/**
 * Formatea un timestamp ISO en "HH:MM" hora local.
 */
function formatHora(isoString) {
  if (!isoString) return "--:--";
  return new Date(isoString).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calcula cuánto tiempo ha pasado desde una fecha ISO hasta ahora.
 * Devuelve un string tipo "2h 34m".
 */
function tiempoTranscurrido(isoString) {
  if (!isoString) return "";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function FichajeRapido({
  estado,
  cargando,
  proyectos,
  clientes,
  onEntrada,
  onSalida,
}) {
  // Controla si mostrar el formulario de detalle o no
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  // Guarda los datos del formulario de detalle antes de confirmar
  const [datosDetalle, setDatosDetalle] = useState(null);

  const trabajando = estado?.trabajando ?? false;
  const fichajeActivo = estado?.fichaje_activo;

  // ─── Acciones ──────────────────────────────────────────────────────────

  const handleClickRapido = () => {
    if (trabajando) {
      onSalida({});
    } else {
      onEntrada({});
    }
  };

  const handleClickDetalle = () => {
    setMostrarDetalle(true);
  };

  const handleConfirmarDetalle = (datos) => {
    setMostrarDetalle(false);
    if (trabajando) {
      onSalida(datos);
    } else {
      onEntrada(datos);
    }
  };

  const handleCancelarDetalle = () => {
    setMostrarDetalle(false);
    setDatosDetalle(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <section className={styles.card}>
      {/* Indicador de estado */}
      <div className={`${styles.estadoBadge} ${trabajando ? styles.activo : styles.inactivo}`}>
        <span className={styles.dot} />
        <span className={styles.estadoTexto}>
          {trabajando
            ? `Trabajando desde las ${formatHora(fichajeActivo?.entrada)} · ${tiempoTranscurrido(fichajeActivo?.entrada)}`
            : "Sin fichar"}
        </span>
      </div>

      {/* Info del proyecto activo */}
      {trabajando && fichajeActivo?.proyecto && (
        <p className={styles.proyectoActivo}>
          <span className={styles.proyectoLabel}>Proyecto:</span>{" "}
          {fichajeActivo.proyecto}
          {fichajeActivo.tipo === "pausa" && (
            <span className={styles.pausaBadge}>PAUSA</span>
          )}
        </p>
      )}

      {/* Botones de acción */}
      {!mostrarDetalle && (
        <div className={styles.acciones}>
          <button
            className={`${styles.btnPrincipal} ${trabajando ? styles.btnSalida : styles.btnEntrada}`}
            onClick={handleClickRapido}
            disabled={cargando}
          >
            {cargando ? (
              <span className={styles.spinner} />
            ) : trabajando ? (
              "⏹ Fichar salida"
            ) : (
              "▶ Fichar entrada"
            )}
          </button>

          <button
            className={styles.btnDetalle}
            onClick={handleClickDetalle}
            disabled={cargando}
            title="Añadir proyecto, tarea u otros detalles"
          >
            + Con detalle
          </button>
        </div>
      )}

      {/* Formulario de detalle */}
      {mostrarDetalle && (
        <FichajeDetalle
          modo={trabajando ? "salida" : "entrada"}
          proyectos={proyectos}
          clientes={clientes}
          onConfirmar={handleConfirmarDetalle}
          onCancelar={handleCancelarDetalle}
          cargando={cargando}
        />
      )}
    </section>
  );
}
