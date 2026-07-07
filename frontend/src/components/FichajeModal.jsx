// NEW: Modal para crear o editar un fichaje manualmente.
import { useState, useEffect } from "react";
import styles from "./FichajeModal.module.css";

// Extrae "YYYY-MM-DD" de un ISO string como "2024-06-10T09:00:00"
function extraerFecha(isoString) {
  if (!isoString) return "";
  return isoString.substring(0, 10);
}

// Extrae "HH:MM" de un ISO string como "2024-06-10T09:00:00"
function extraerHora(isoString) {
  if (!isoString) return "";
  return isoString.substring(11, 16);
}

// Combina fecha "YYYY-MM-DD" y hora "HH:MM" en un ISO datetime string
function toISOLocal(fecha, hora) {
  return `${fecha}T${hora}:00`;
}

export default function FichajeModal({
  abierto,
  fichaje,
  proyectos,
  clientes,
  onGuardar,
  onCerrar,
}) {
  const [form, setForm] = useState({
    fecha: "",
    hora_entrada: "",
    hora_salida: "",
    proyecto: "",
    cliente: "",
    tarea: "",
    tipo: "normal",
    facturado: false,
    notas: "",
  });
  const [errorLocal, setErrorLocal] = useState("");

  // Poblar el formulario cuando se abre el modal
  useEffect(() => {
    if (!abierto) return;
    if (fichaje) {
      setForm({
        fecha: extraerFecha(fichaje.entrada),
        hora_entrada: extraerHora(fichaje.entrada),
        hora_salida: extraerHora(fichaje.salida),
        proyecto: fichaje.proyecto || "",
        cliente: fichaje.cliente || "",
        tarea: fichaje.tarea || "",
        tipo: fichaje.tipo || "normal",
        facturado: fichaje.facturado ?? false,
        notas: fichaje.notas || "",
      });
    } else {
      const hoy = new Date().toISOString().substring(0, 10);
      setForm({
        fecha: hoy,
        hora_entrada: "",
        hora_salida: "",
        proyecto: "",
        cliente: "",
        tarea: "",
        tipo: "normal",
        facturado: false,
        notas: "",
      });
    }
    setErrorLocal("");
  }, [abierto, fichaje]);

  if (!abierto) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleGuardar = () => {
    if (!form.hora_entrada) {
      setErrorLocal("La hora de entrada es obligatoria.");
      return;
    }
    // Validación frontend: salida debe ser posterior a entrada
    if (form.hora_salida && form.hora_salida <= form.hora_entrada) {
      setErrorLocal("La hora de salida debe ser posterior a la de entrada.");
      return;
    }
    const datos = {
      entrada: toISOLocal(form.fecha, form.hora_entrada),
      salida: form.hora_salida ? toISOLocal(form.fecha, form.hora_salida) : null,
      proyecto: form.proyecto || null,
      cliente: form.cliente || null,
      tarea: form.tarea || null,
      tipo: form.tipo,
      facturado: form.facturado,
      notas: form.notas || null,
    };
    onGuardar(datos);
  };

  const titulo = fichaje ? "Editar fichaje" : "Añadir fichaje manual";

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={styles.modal}>

        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitulo}>{titulo}</h2>
          <button className={styles.btnCerrar} onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        {errorLocal && (
          <div className={styles.errorLocal} role="alert">{errorLocal}</div>
        )}

        <div className={styles.cuerpo}>

          <div className={styles.campo}>
            <label className={styles.label} htmlFor="modal-fecha">Fecha</label>
            <input
              id="modal-fecha"
              type="date"
              name="fecha"
              className={styles.input}
              value={form.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.fila}>
            <div className={styles.campo}>
              <label className={styles.label} htmlFor="modal-hora-entrada">Hora de entrada</label>
              <input
                id="modal-hora-entrada"
                type="time"
                name="hora_entrada"
                className={styles.input}
                value={form.hora_entrada}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.campo}>
              <label className={styles.label} htmlFor="modal-hora-salida">Hora de salida</label>
              <input
                id="modal-hora-salida"
                type="time"
                name="hora_salida"
                className={styles.input}
                value={form.hora_salida}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.campo}>
            <label className={styles.label} htmlFor="modal-proyecto">Proyecto</label>
            <input
              id="modal-proyecto"
              type="text"
              name="proyecto"
              className={styles.input}
              value={form.proyecto}
              onChange={handleChange}
              list="modal-proyectos-list"
              placeholder="Nombre del proyecto..."
            />
            <datalist id="modal-proyectos-list">
              {proyectos.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className={styles.campo}>
            <label className={styles.label} htmlFor="modal-cliente">Cliente</label>
            <input
              id="modal-cliente"
              type="text"
              name="cliente"
              className={styles.input}
              value={form.cliente}
              onChange={handleChange}
              list="modal-clientes-list"
              placeholder="Nombre del cliente..."
            />
            <datalist id="modal-clientes-list">
              {clientes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className={styles.campo}>
            <label className={styles.label} htmlFor="modal-tarea">Tarea</label>
            <textarea
              id="modal-tarea"
              name="tarea"
              className={styles.textarea}
              value={form.tarea}
              onChange={handleChange}
              placeholder="Descripción de la tarea..."
              rows={3}
            />
          </div>

          <div className={styles.fila}>
            <div className={styles.campo}>
              <label className={styles.label} htmlFor="modal-tipo">Tipo</label>
              <select
                id="modal-tipo"
                name="tipo"
                className={styles.input}
                value={form.tipo}
                onChange={handleChange}
              >
                <option value="normal">Normal</option>
                <option value="pausa">Pausa</option>
              </select>
            </div>
            <div className={styles.campoCheck}>
              <label className={styles.labelCheck}>
                <input
                  type="checkbox"
                  name="facturado"
                  checked={form.facturado}
                  onChange={handleChange}
                />
                Facturado
              </label>
            </div>
          </div>

        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.btnGuardar} onClick={handleGuardar}>
            Guardar
          </button>
          <button className={styles.btnCancelar} onClick={onCerrar}>
            Cancelar
          </button>
        </footer>

      </div>
    </div>
  );
}
