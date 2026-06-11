/**
 * Hook personalizado que centraliza el estado de fichaje.
 * Encapsula todas las llamadas a la API y expone el estado/acciones al resto de componentes.
 * Sin lógica de negocio: solo orquesta llamadas a la API y gestiona el estado de UI.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getEstado,
  registrarEntrada,
  registrarSalida,
  getFichajes,
  editarFichaje,
  eliminarFichaje,
  getProyectos,
  getClientes,
  exportarExcel,
} from "../api/client";

export function useFichaje() {
  // ─── Estado principal ─────────────────────────────────────────────────
  const [estado, setEstado] = useState(null);           // Estado actual (trabajando/sin fichar)
  const [fichajes, setFichajes] = useState([]);         // Lista de fichajes del historial
  const [totalHoras, setTotalHoras] = useState(0);      // Total de horas del período visible
  const [proyectos, setProyectos] = useState([]);       // Lista para autocompletado
  const [clientes, setClientes] = useState([]);         // Lista de clientes para autocompletado
  const [cargando, setCargando] = useState(false);      // Spinner de operaciones
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState(null);             // Mensaje de error visible en UI
  const [exito, setExito] = useState(null);             // Mensaje de éxito temporal

  // ─── Filtros del historial ────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    proyecto: "",
    cliente: "",
    facturado: "",
  });

  // ─── Helpers ──────────────────────────────────────────────────────────

  const mostrarError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const mostrarExito = useCallback((msg) => {
    setExito(msg);
    setTimeout(() => setExito(null), 3000);
  }, []);

  // ─── Cargar estado actual ─────────────────────────────────────────────

  const cargarEstado = useCallback(async () => {
    try {
      const data = await getEstado();
      setEstado(data);
    } catch (e) {
      mostrarError(`Error al obtener estado: ${e.message}`);
    }
  }, [mostrarError]);

  // ─── Cargar historial ─────────────────────────────────────────────────

  const cargarHistorial = useCallback(async (filtrosActuales = filtros) => {
    setCargandoHistorial(true);
    try {
      const data = await getFichajes(filtrosActuales);
      setFichajes(data.fichajes);
      setTotalHoras(data.total_horas);
    } catch (e) {
      mostrarError(`Error al cargar historial: ${e.message}`);
    } finally {
      setCargandoHistorial(false);
    }
  }, [filtros, mostrarError]);

  // ─── Cargar proyectos ─────────────────────────────────────────────────

  const cargarProyectos = useCallback(async () => {
    try {
      const data = await getProyectos();
      setProyectos(data.proyectos);
    } catch (e) {
      console.warn("No se pudieron cargar los proyectos:", e.message);
    }
  }, []);

  const cargarClientes = useCallback(async () => {
    try {
      const data = await getClientes();
      setClientes(data.clientes);
    } catch (e) {
      console.warn("No se pudieron cargar los clientes:", e.message);
    }
  }, []);

  // ─── Acciones de fichaje ──────────────────────────────────────────────

  const ficharEntrada = useCallback(async (datos = {}) => {
    setCargando(true);
    setError(null);
    try {
      await registrarEntrada(datos);
      await cargarEstado();
      await cargarHistorial();
      await cargarProyectos();
      await cargarClientes();
      mostrarExito("¡Entrada registrada correctamente!");
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }, [cargarEstado, cargarHistorial, cargarProyectos, cargarClientes, mostrarError, mostrarExito]);

  const ficharSalida = useCallback(async (datos = {}) => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await registrarSalida(datos);
      await cargarEstado();
      await cargarHistorial();
      const horas = resultado.horas?.toFixed(2) ?? "?";
      mostrarExito(`¡Salida registrada! Has trabajado ${horas} horas.`);
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }, [cargarEstado, cargarHistorial, mostrarError, mostrarExito]);

  // ─── Editar y eliminar ────────────────────────────────────────────────

  const actualizarFichaje = useCallback(async (id, datos) => {
    setCargando(true);
    try {
      await editarFichaje(id, datos);
      await cargarHistorial();
      mostrarExito("Fichaje actualizado.");
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }, [cargarHistorial, mostrarError, mostrarExito]);

  const borrarFichaje = useCallback(async (id) => {
    setCargando(true);
    try {
      await eliminarFichaje(id);
      await cargarHistorial();
      mostrarExito("Fichaje eliminado.");
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }, [cargarHistorial, mostrarError, mostrarExito]);

  // ─── Exportar Excel ───────────────────────────────────────────────────

  const exportar = useCallback(async (filtrosExport = {}) => {
    setCargando(true);
    try {
      const resultado = await exportarExcel(filtrosExport);
      mostrarExito(`Excel generado: ${resultado.hojas_generadas.join(", ")}`);
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargando(false);
    }
  }, [mostrarError, mostrarExito]);

  // ─── Aplicar filtros ──────────────────────────────────────────────────

  const aplicarFiltros = useCallback((nuevosFiltros) => {
    const filtrosMerge = { ...filtros, ...nuevosFiltros };
    setFiltros(filtrosMerge);
    cargarHistorial(filtrosMerge);
  }, [filtros, cargarHistorial]);

  const limpiarFiltros = useCallback(() => {
    const vacio = { fecha_inicio: "", fecha_fin: "", proyecto: "", cliente: "", facturado: "" };
    setFiltros(vacio);
    cargarHistorial(vacio);
  }, [cargarHistorial]);

  // ─── Carga inicial ────────────────────────────────────────────────────

  useEffect(() => {
    cargarEstado();
    cargarHistorial();
    cargarProyectos();
    cargarClientes();
  }, []);

  // Refrescar el estado cada 60 segundos para mantener el contador actualizado
  useEffect(() => {
    const intervalo = setInterval(cargarEstado, 60_000);
    return () => clearInterval(intervalo);
  }, [cargarEstado]);

  return {
    // Estado
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
    // Acciones
    ficharEntrada,
    ficharSalida,
    actualizarFichaje,
    borrarFichaje,
    exportar,
    aplicarFiltros,
    limpiarFiltros,
    cargarEstado,
    cargarHistorial,
    cargarClientes,
  };
}
