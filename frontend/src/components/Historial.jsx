/**
 * Componente de historial: tabla de registros con filtros y totales.
 * Permite editar campos inline y eliminar registros.
 */

import { useState } from "react";
import styles from "./Historial.module.css";

/**
 * Formatea una fecha ISO como "DD/MM/YYYY".
 */
function formatFecha(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("es-ES");
}

/**
 * Formatea una fecha ISO como "HH:MM".
 */
function formatHora(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convierte horas decimales a "Xh YYm".
 */
function formatHoras(horas) {
  if (horas == null) return "-";
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function Historial({
  fichajes,
  totalHoras,
  cargando,
  filtros,
  proyectos,
  clientes,
  onFiltrar,
  onLimpiarFiltros,
  onEditar,
  onEliminar,
}) {
  const [confirmEliminar, setConfirmEliminar] = useState(null); // ID a eliminar

  // ─── Filtros ───────────────────────────────────────────────────────────

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    onFiltrar({ [name]: value });
  };

  // ─── Eliminar con confirmación ─────────────────────────────────────────

  const handleEliminarClick = (id) => {
    setConfirmEliminar(id);
  };

  const handleConfirmarEliminar = () => {
    onEliminar(confirmEliminar);
    setConfirmEliminar(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <section className={styles.seccion}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Historial</h2>
        <span className={styles.total}>
          Total: <strong>{formatHoras(totalHoras)}</strong>
          {" · "}
          <span className={styles.registros}>{fichajes.length} registros</span>
        </span>
      </div>

      {/* ─── Filtros ─────────────────────────────────────────────────────── */}
      <div className={styles.filtros}>
        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Desde</label>
          <input
            type="date"
            name="fecha_inicio"
            className={styles.filtroInput}
            value={filtros.fecha_inicio}
            onChange={handleFiltroChange}
          />
        </div>

        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Hasta</label>
          <input
            type="date"
            name="fecha_fin"
            className={styles.filtroInput}
            value={filtros.fecha_fin}
            onChange={handleFiltroChange}
          />
        </div>

        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Proyecto</label>
          <input
            type="text"
            name="proyecto"
            className={styles.filtroInput}
            placeholder="Buscar proyecto..."
            value={filtros.proyecto}
            onChange={handleFiltroChange}
            list="proyectos-list"
          />
          <datalist id="proyectos-list">
            {proyectos.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Cliente</label>
          <input
            type="text"
            name="cliente"
            className={styles.filtroInput}
            placeholder="Buscar cliente..."
            value={filtros.cliente}
            onChange={handleFiltroChange}
            list="clientes-list"
          />
          <datalist id="clientes-list">
            {(clientes || []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Facturado</label>
          <select
            name="facturado"
            className={styles.filtroInput}
            value={filtros.facturado}
            onChange={handleFiltroChange}
          >
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>

        <button
          className={styles.btnLimpiar}
          onClick={onLimpiarFiltros}
          title="Limpiar todos los filtros"
        >
          ✕ Limpiar
        </button>
      </div>

      {/* ─── Tabla ────────────────────────────────────────────────────────── */}
      {cargando ? (
        <div className={styles.cargando}>Cargando registros...</div>
      ) : fichajes.length === 0 ? (
        <div className={styles.vacio}>
          No hay registros para el período seleccionado.
        </div>
      ) : (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Tarea</th>
                <th>Pausa</th>
                <th>Facturado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fichajes.map((f) => (
                <FilaFichaje
                  key={f.id}
                  fichaje={f}
                  proyectos={proyectos}
                  clientes={clientes}
                  onEditar={onEditar}
                  onEliminar={handleEliminarClick}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.filaTotal}>
                <td colSpan={3}>
                  <strong>TOTAL</strong>
                </td>
                <td>
                  <strong>{formatHoras(totalHoras)}</strong>
                </td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ─── Modal de confirmación de borrado ─────────────────────────────── */}
      {confirmEliminar !== null && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <p>¿Eliminar este fichaje? Esta acción no se puede deshacer.</p>
            <div className={styles.modalBotones}>
              <button
                className={styles.btnEliminarConfirm}
                onClick={handleConfirmarEliminar}
              >
                Eliminar
              </button>
              <button
                className={styles.btnCancelarModal}
                onClick={() => setConfirmEliminar(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Fila individual del historial con edición inline.
 */
function FilaFichaje({ fichaje, proyectos, clientes, onEditar, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    proyecto: fichaje.proyecto || "",
    cliente: fichaje.cliente || "",
    tarea: fichaje.tarea || "",
    facturado: fichaje.facturado,
    notas: fichaje.notas || "",
  });

  const handleGuardar = () => {
    onEditar(fichaje.id, {
      proyecto: form.proyecto || null,
      cliente: form.cliente || null,
      tarea: form.tarea || null,
      facturado: form.facturado,
      notas: form.notas || null,
    });
    setEditando(false);
  };

  if (editando) {
    return (
      <tr className={styles.filaEdicion}>
        <td>{formatFecha(fichaje.entrada)}</td>
        <td>{formatHora(fichaje.entrada)}</td>
        <td>{formatHora(fichaje.salida)}</td>
        <td>{formatHoras(fichaje.horas)}</td>
        <td>
          <input
            type="text"
            value={form.proyecto}
            onChange={(e) => setForm({ ...form, proyecto: e.target.value })}
            className={styles.inputEdicion}
            list="proyectos-list"
          />
        </td>
        <td>
          <input
            type="text"
            value={form.cliente}
            onChange={(e) => setForm({ ...form, cliente: e.target.value })}
            className={styles.inputEdicion}
            list="clientes-list"
          />
        </td>
        <td>
          <input
            type="text"
            value={form.tarea}
            onChange={(e) => setForm({ ...form, tarea: e.target.value })}
            className={styles.inputEdicion}
          />
        </td>
        <td>{fichaje.tipo === "pausa" ? "Sí" : "No"}</td>
        <td>
          <input
            type="checkbox"
            checked={form.facturado}
            onChange={(e) => setForm({ ...form, facturado: e.target.checked })}
          />
        </td>
        <td>
          <button className={styles.btnGuardar} onClick={handleGuardar}>
            ✓
          </button>
          <button
            className={styles.btnCancelarEdit}
            onClick={() => setEditando(false)}
          >
            ✕
          </button>
        </td>
      </tr>
    );
  }

  const esPausa = fichaje.tipo === "pausa";
  const esAbierto = !fichaje.salida;

  return (
    <tr
      className={`${esPausa ? styles.filaPausa : ""} ${esAbierto ? styles.filaAbierta : ""} ${fichaje.facturado ? styles.filaFacturado : ""}`}
    >
      <td>{formatFecha(fichaje.entrada)}</td>
      <td>{formatHora(fichaje.entrada)}</td>
      <td>
        {esAbierto ? (
          <span className={styles.enCurso}>En curso</span>
        ) : (
          formatHora(fichaje.salida)
        )}
      </td>
      <td className={styles.celdaHoras}>
        {esAbierto ? "-" : formatHoras(fichaje.horas)}
      </td>
      <td className={styles.celdaProyecto}>{fichaje.proyecto || "-"}</td>
      <td className={styles.celdaProyecto}>{fichaje.cliente || "-"}</td>
      <td className={styles.celdaTarea} title={fichaje.tarea || ""}>
        {fichaje.tarea
          ? fichaje.tarea.length > 40
            ? fichaje.tarea.substring(0, 40) + "…"
            : fichaje.tarea
          : "-"}
      </td>
      <td>{esPausa ? "✓" : ""}</td>
      <td>{fichaje.facturado ? "✓" : ""}</td>
      <td>
        <div className={styles.acciones}>
          <button
            className={styles.btnEditar}
            onClick={() => setEditando(true)}
            title="Editar"
          >
            ✎
          </button>
          <button
            className={styles.btnEliminar}
            onClick={() => onEliminar(fichaje.id)}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
