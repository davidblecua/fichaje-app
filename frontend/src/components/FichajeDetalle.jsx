/**
 * Formulario de detalle para fichar entrada o salida con información adicional.
 * Permite añadir proyecto (con autocompletado), tarea, tipo y facturado.
 */

import { useState, useRef, useEffect } from "react";
import styles from "./FichajeDetalle.module.css";

const TZ = import.meta.env.VITE_TIMEZONE || "Europe/Madrid";

/** Devuelve la fecha/hora actual en la zona configurada para datetime-local (YYYY-MM-DDTHH:MM). */
function ahoraLocal() {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: TZ })
    .slice(0, 16)
    .replace(" ", "T");
}

/** Convierte un Date a ISO sin zona horaria en la zona configurada (YYYY-MM-DDTHH:MM:SS). */
function toLocalISO(d) {
  return new Date(d)
    .toLocaleString("sv-SE", { timeZone: TZ })
    .replace(" ", "T");
}

export default function FichajeDetalle({
  modo,          // "entrada" | "salida"
  proyectos,     // string[] para autocompletado
  clientes,      // string[] para autocompletado
  onConfirmar,   // (datos) => void
  onCancelar,    // () => void
  cargando,
}) {
  const [hora, setHora] = useState(ahoraLocal);
  const [proyecto, setProyecto] = useState("");
  const [cliente, setCliente] = useState("");
  const [tarea, setTarea] = useState("");
  const [tipo, setTipo] = useState("normal");
  const [facturado, setFacturado] = useState(false);
  const [notas, setNotas] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerenciasCliente, setSugerenciasCliente] = useState([]);
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);
  const proyectoRef = useRef(null);

  useEffect(() => {
    // Foco automático en el campo de proyecto al abrir
    proyectoRef.current?.focus();
  }, []);

  // ─── Autocompletado de proyecto ─────────────────────────────────────

  const handleProyectoChange = (e) => {
    const valor = e.target.value;
    setProyecto(valor);

    if (valor.length > 0) {
      const filtradas = proyectos.filter((p) =>
        p.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerencias(filtradas);
      setMostrarSugerencias(filtradas.length > 0);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarSugerencia = (sugerencia) => {
    setProyecto(sugerencia);
    setSugerencias([]);
    setMostrarSugerencias(false);
  };

  // ─── Autocompletado de cliente ───────────────────────────────────────

  const handleClienteChange = (e) => {
    const valor = e.target.value;
    setCliente(valor);
    if (valor.length > 0) {
      const filtradas = (clientes || []).filter((c) =>
        c.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerenciasCliente(filtradas);
      setMostrarSugerenciasCliente(filtradas.length > 0);
    } else {
      setSugerenciasCliente([]);
      setMostrarSugerenciasCliente(false);
    }
  };

  const seleccionarSugerenciaCliente = (sugerencia) => {
    setCliente(sugerencia);
    setSugerenciasCliente([]);
    setMostrarSugerenciasCliente(false);
  };

  // ─── Submit ──────────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    const datos = {
      proyecto: proyecto.trim() || undefined,
      cliente: cliente.trim() || undefined,
      tarea: tarea.trim() || undefined,
      notas: notas.trim() || undefined,
    };
    // Hora personalizada: solo enviar si difiere del momento actual (> 1 min)
    // Usamos ISO local sin 'Z' para evitar conversión UTC en el backend
    const horaSeleccionada = new Date(hora);
    const ahora = new Date();
    if (Math.abs(ahora - horaSeleccionada) > 60_000) {
      if (modo === "entrada") datos.entrada = toLocalISO(horaSeleccionada);
      if (modo === "salida")  datos.salida  = toLocalISO(horaSeleccionada);
    }
    if (modo === "entrada") datos.tipo = tipo;
    if (modo === "salida")  datos.facturado = facturado;
    onConfirmar(datos);
  };

  const esEntrada = modo === "entrada";
  const labelBoton = esEntrada ? "▶ Confirmar entrada" : "⏹ Confirmar salida";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.subtitulo}>
        {esEntrada ? "Añade detalles a la entrada" : "Añade detalles a la salida"}
      </p>

      {/* Hora de entrada / salida */}
      <div className={styles.campoWrap}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor="hora">
            {esEntrada ? "Hora de entrada" : "Hora de salida"}
          </label>
          <button
            type="button"
            className={styles.btnAhora}
            onClick={() => setHora(ahoraLocal())}
          >
            Hora actual
          </button>
        </div>
        <input
          id="hora"
          type="datetime-local"
          className={`${styles.input} ${styles.inputHora}`}
          value={hora}
          max={ahoraLocal()}
          onChange={(e) => setHora(e.target.value)}
        />
      </div>

      {/* Proyecto con autocompletado */}
      <div className={styles.campoWrap}>
        <label className={styles.label} htmlFor="proyecto">
          Proyecto / Cliente
        </label>
        <div className={styles.autocompleteWrap}>
          <input
            ref={proyectoRef}
            id="proyecto"
            type="text"
            className={styles.input}
            placeholder="Ej: Acme Corp, Proyecto web..."
            value={proyecto}
            onChange={handleProyectoChange}
            onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
            autoComplete="off"
          />
          {mostrarSugerencias && (
            <ul className={styles.sugerencias}>
              {sugerencias.map((s) => (
                <li
                  key={s}
                  className={styles.sugerencia}
                  onMouseDown={() => seleccionarSugerencia(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cliente con autocompletado */}
      <div className={styles.campoWrap}>
        <label className={styles.label} htmlFor="cliente">
          Cliente
        </label>
        <div className={styles.autocompleteWrap}>
          <input
            id="cliente"
            type="text"
            className={styles.input}
            placeholder="Ej: Empresa S.L., Juan García..."
            value={cliente}
            onChange={handleClienteChange}
            onBlur={() => setTimeout(() => setMostrarSugerenciasCliente(false), 150)}
            autoComplete="off"
          />
          {mostrarSugerenciasCliente && (
            <ul className={styles.sugerencias}>
              {sugerenciasCliente.map((s) => (
                <li
                  key={s}
                  className={styles.sugerencia}
                  onMouseDown={() => seleccionarSugerenciaCliente(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Descripción de tarea */}
      <div className={styles.campoWrap}>
        <label className={styles.label} htmlFor="tarea">
          Descripción de tarea
        </label>
        <input
          id="tarea"
          type="text"
          className={styles.input}
          placeholder="¿Qué vas a hacer?"
          value={tarea}
          onChange={(e) => setTarea(e.target.value)}
        />
      </div>

      {/* Tipo de registro — solo en entrada */}
      {esEntrada && (
        <div className={styles.campoWrap}>
          <label className={styles.label}>Tipo de registro</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="tipo"
                value="normal"
                checked={tipo === "normal"}
                onChange={() => setTipo("normal")}
              />
              Normal
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="tipo"
                value="pausa"
                checked={tipo === "pausa"}
                onChange={() => setTipo("pausa")}
              />
              Pausa / Descanso
            </label>
          </div>
        </div>
      )}

      {/* Facturado — solo en salida */}
      {!esEntrada && (
        <div className={styles.campoWrap}>
          <label className={`${styles.label} ${styles.checkLabel}`}>
            <input
              type="checkbox"
              checked={facturado}
              onChange={(e) => setFacturado(e.target.checked)}
              className={styles.checkbox}
            />
            Marcar como facturado
          </label>
        </div>
      )}

      {/* Notas */}
      <div className={styles.campoWrap}>
        <label className={styles.label} htmlFor="notas">
          Notas (opcional)
        </label>
        <textarea
          id="notas"
          className={`${styles.input} ${styles.textarea}`}
          placeholder="Observaciones, incidencias..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
        />
      </div>

      {/* Botones */}
      <div className={styles.botones}>
        <button
          type="submit"
          className={`${styles.btn} ${esEntrada ? styles.btnEntrada : styles.btnSalida}`}
          disabled={cargando}
        >
          {cargando ? "Registrando..." : labelBoton}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnCancelar}`}
          onClick={onCancelar}
          disabled={cargando}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
