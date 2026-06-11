import { useState } from "react";
import { importarFichajes } from "../api/client";
import styles from "./ImportarFichajes.module.css";

const EJEMPLO = JSON.stringify([
  {
    entrada: "2025-06-01T09:00:00",
    salida: "2025-06-01T17:30:00",
    proyecto: "Proyecto ejemplo",
    cliente: "Cliente ejemplo",
    tarea: "Descripción de la tarea",
    tipo: "normal",
    facturado: false,
    notas: ""
  }
], null, 2);

export default function ImportarFichajes({ onCerrar, onImportado }) {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleImportar = async () => {
    setError(null);
    setResultado(null);

    let datos;
    try {
      datos = JSON.parse(texto);
      if (!Array.isArray(datos)) throw new Error("El JSON debe ser un array [ ... ]");
    } catch (e) {
      setError(`JSON inválido: ${e.message}`);
      return;
    }

    setCargando(true);
    try {
      const res = await importarFichajes(datos);
      setResultado(res);
      if (res.importados > 0) onImportado?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTexto(ev.target.result);
    reader.readAsText(file);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>Importar fichajes</h2>
          <button className={styles.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        <p className={styles.desc}>
          Pega un array JSON con tus fichajes o carga un archivo .json.
          Solo el campo <code>entrada</code> es obligatorio.
        </p>

        <div className={styles.accionesArchivo}>
          <label className={styles.btnArchivo}>
            📂 Cargar archivo JSON
            <input type="file" accept=".json" onChange={handleArchivo} hidden />
          </label>
          <button className={styles.btnEjemplo} onClick={() => setTexto(EJEMPLO)}>
            Ver ejemplo
          </button>
        </div>

        <textarea
          className={styles.textarea}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder='[{ "entrada": "2025-06-01T09:00:00", ... }]'
          rows={10}
          spellCheck={false}
        />

        {error && <p className={styles.error}>⚠ {error}</p>}

        {resultado && (
          <div className={resultado.errores > 0 ? styles.resultadoParcial : styles.resultadoOk}>
            <strong>✓ {resultado.importados} importados</strong>
            {resultado.errores > 0 && (
              <>
                {" · "}<span className={styles.errCount}>{resultado.errores} errores</span>
                <ul className={styles.detalleErrores}>
                  {resultado.detalle.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        <div className={styles.botones}>
          <button
            className={styles.btnImportar}
            onClick={handleImportar}
            disabled={cargando || !texto.trim()}
          >
            {cargando ? "Importando..." : "⬆ Importar"}
          </button>
          <button className={styles.btnCancelar} onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
