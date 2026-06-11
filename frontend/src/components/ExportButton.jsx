/**
 * Botón de exportación a Excel con opciones de rango de fechas.
 */

import { useState } from "react";
import styles from "./ExportButton.module.css";

export default function ExportButton({ onExportar, cargando }) {
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const handleExportarTodo = () => {
    onExportar({});
  };

  const handleExportarFiltrado = (e) => {
    e.preventDefault();
    onExportar({
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
    });
    setMostrarOpciones(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.botones}>
        <button
          className={styles.btnExportar}
          onClick={handleExportarTodo}
          disabled={cargando}
          title="Exportar todos los registros al fichero Excel"
        >
          {cargando ? (
            <>
              <span className={styles.spinnerVerde} />
              Generando...
            </>
          ) : (
            <>
              <span className={styles.icono}>📊</span>
              Exportar a Excel
            </>
          )}
        </button>

        <button
          className={styles.btnOpciones}
          onClick={() => setMostrarOpciones(!mostrarOpciones)}
          disabled={cargando}
          title="Exportar un rango de fechas específico"
        >
          {mostrarOpciones ? "▲" : "▼"}
        </button>
      </div>

      {mostrarOpciones && (
        <form className={styles.opciones} onSubmit={handleExportarFiltrado}>
          <p className={styles.opcionesTitle}>Exportar rango específico</p>
          <div className={styles.campos}>
            <div className={styles.campo}>
              <label className={styles.label}>Desde</label>
              <input
                type="date"
                className={styles.input}
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className={styles.campo}>
              <label className={styles.label}>Hasta</label>
              <input
                type="date"
                className={styles.input}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={styles.btnExportarRango} disabled={cargando}>
            Exportar rango
          </button>
        </form>
      )}
    </div>
  );
}
