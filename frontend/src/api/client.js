/**
 * cliente de API centralizado.
 * Todas las llamadas al backend FastAPI pasan por este módulo.
 * Así el frontend es stateless y fácilmente portable a React Native.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Helper genérico para hacer fetch con manejo de errores uniforme.
 * Lanza un Error con el mensaje del backend si la respuesta no es OK.
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) {
    // Sin contenido (ej: DELETE exitoso)
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    // El backend devuelve { detail: "mensaje de error" }
    const mensaje = data?.detail || `Error ${response.status}`;
    throw new Error(mensaje);
  }

  return data;
}

// ─── Estado actual ────────────────────────────────────────────────────────

/** Consulta si hay una entrada abierta actualmente. */
export async function getEstado() {
  return request("/fichajes/estado");
}

// ─── Registrar entradas y salidas ─────────────────────────────────────────

/**
 * Registra una nueva entrada de fichaje.
 * @param {Object} datos - { proyecto?, tarea?, tipo?, notas? }
 */
export async function registrarEntrada(datos = {}) {
  return request("/fichajes/entrada", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

/**
 * Registra la salida del fichaje activo.
 * @param {Object} datos - { proyecto?, tarea?, facturado?, notas? }
 */
export async function registrarSalida(datos = {}) {
  return request("/fichajes/salida", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

// ─── Historial ─────────────────────────────────────────────────────────────

/**
 * Obtiene la lista de fichajes con filtros opcionales.
 * @param {Object} filtros - { fecha_inicio?, fecha_fin?, proyecto?, facturado? }
 */
export async function getFichajes(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
  if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
  if (filtros.proyecto) params.append("proyecto", filtros.proyecto);
  if (filtros.cliente) params.append("cliente", filtros.cliente);
  if (filtros.facturado !== undefined && filtros.facturado !== "")
    params.append("facturado", filtros.facturado);

  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/fichajes${query}`);
}

/**
 * Edita parcialmente un fichaje existente.
 * @param {number} id - ID del fichaje
 * @param {Object} datos - Campos a actualizar
 */
export async function editarFichaje(id, datos) {
  return request(`/fichajes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

/**
 * Elimina un fichaje por ID.
 * @param {number} id - ID del fichaje
 */
export async function eliminarFichaje(id) {
  return request(`/fichajes/${id}`, {
    method: "DELETE",
  });
}

// NEW: Crea un fichaje manualmente con todos los campos
/**
 * Crea un fichaje manualmente sin depender del flujo entrada/salida en tiempo real.
 * @param {Object} datos - { entrada, salida?, proyecto?, cliente?, tarea?, tipo, facturado, notas? }
 */
export async function crearFichaje(datos) {
  return request("/fichajes", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

// ─── Proyectos ─────────────────────────────────────────────────────────────

/** Obtiene la lista de proyectos únicos para autocompletado. */
export async function getProyectos() {
  return request("/fichajes/proyectos");
}

/** Obtiene la lista de clientes únicos para autocompletado (catálogo + fichajes). */
export async function getClientes() {
  return request("/fichajes/clientes");
}

// ─── Gestión de clientes ───────────────────────────────────────────────────

/** Lista todos los clientes del catálogo con sus IDs. */
export async function listarClientesCatalogo() {
  return request("/clientes");
}

/** Crea un cliente en el catálogo. */
export async function crearCliente(nombre) {
  return request("/clientes", {
    method: "POST",
    body: JSON.stringify({ nombre }),
  });
}

/** Elimina un cliente del catálogo. */
export async function eliminarCliente(id) {
  return request(`/clientes/${id}`, { method: "DELETE" });
}

// ─── Importar fichajes ─────────────────────────────────────────────────────

/**
 * Importa una lista de fichajes en lote.
 * @param {Array} fichajes - Array de objetos con estructura FichajeImport
 */
export async function importarFichajes(fichajes) {
  return request("/import/fichajes", {
    method: "POST",
    body: JSON.stringify(fichajes),
  });
}

// ─── Exportar ──────────────────────────────────────────────────────────────

/**
 * Solicita al backend que genere/actualice el fichero Excel (guarda en servidor).
 * @param {Object} filtros - { fecha_inicio?, fecha_fin? }
 */
export async function exportarExcel(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
  if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);

  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/export/excel${query}`, {
    method: "POST",
  });
}

/**
 * Descarga el Excel directamente desde el backend como blob binario.
 * Usar con showSaveFilePicker() o <a download> para que el usuario elija dónde guardarlo.
 * @param {Object} filtros - { fecha_inicio?, fecha_fin? }
 * @returns {Promise<Response>} Respuesta raw con el binario del .xlsx
 */
export async function downloadExcel(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
  if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);

  const query = params.toString() ? `?${params.toString()}` : "";
  const url = `${BASE_URL}/export/excel/download${query}`;
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.detail || `Error ${response.status}`);
  }

  return response;
}
