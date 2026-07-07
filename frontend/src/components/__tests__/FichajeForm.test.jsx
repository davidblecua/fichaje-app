// NEW: Tests de integración para Historial (botón Editar) y FichajeModal (formulario)
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Historial from "../Historial";
import FichajeModal from "../FichajeModal";

const FILTROS = {
  fecha_inicio: "",
  fecha_fin: "",
  proyecto: "",
  cliente: "",
  facturado: "",
};

const FICHAJE = {
  id: 1,
  entrada: "2024-06-10T09:00:00",
  salida: "2024-06-10T17:30:00",
  horas: 8.5,
  proyecto: "Web Acme",
  cliente: "Acme S.L.",
  tarea: "Desarrollo",
  tipo: "normal",
  facturado: false,
  notas: null,
  creado_en: "2024-06-10T09:00:00",
  actualizado_en: "2024-06-10T17:30:00",
};

// NEW: clicking Editar on a row calls onAbrirEdicion with the fichaje object
describe("Historial — botón Editar", () => {
  it("abre_modal_al_pulsar_editar", async () => {
    const onAbrirEdicion = vi.fn();
    render(
      <Historial
        fichajes={[FICHAJE]}
        totalHoras={8.5}
        cargando={false}
        filtros={FILTROS}
        proyectos={[]}
        clientes={[]}
        onFiltrar={() => {}}
        onLimpiarFiltros={() => {}}
        onAbrirEdicion={onAbrirEdicion}
        onEliminar={() => {}}
      />
    );

    await userEvent.click(screen.getByTitle("Editar"));

    expect(onAbrirEdicion).toHaveBeenCalledTimes(1);
    expect(onAbrirEdicion).toHaveBeenCalledWith(FICHAJE);
  });
});

// NEW: FichajeModal form behavior
describe("FichajeModal — formulario", () => {
  // NEW: the proyecto datalist shows options from the proyectos prop
  it("combobox_muestra_proyectos_existentes", () => {
    render(
      <FichajeModal
        abierto={true}
        fichaje={null}
        proyectos={["Proyecto A", "Proyecto B"]}
        clientes={[]}
        onGuardar={() => {}}
        onCerrar={() => {}}
      />
    );

    // datalist options are rendered even if not visually a combobox dropdown
    const datalist = document.getElementById("modal-proyectos-list");
    const opciones = Array.from(datalist.querySelectorAll("option")).map(
      (o) => o.value
    );
    expect(opciones).toContain("Proyecto A");
    expect(opciones).toContain("Proyecto B");
  });

  // NEW: user can type a project name that isn't in the datalist
  it("combobox_acepta_valor_nuevo", async () => {
    render(
      <FichajeModal
        abierto={true}
        fichaje={null}
        proyectos={["Proyecto A"]}
        clientes={[]}
        onGuardar={() => {}}
        onCerrar={() => {}}
      />
    );

    const input = screen.getByLabelText("Proyecto");
    await userEvent.clear(input);
    await userEvent.type(input, "Proyecto Nuevo XYZ");

    expect(input.value).toBe("Proyecto Nuevo XYZ");
  });

  // NEW: submitting the edit form calls onGuardar with the correct data shape
  it("guardar_edicion_llama_patch", async () => {
    const onGuardar = vi.fn();
    render(
      <FichajeModal
        abierto={true}
        fichaje={FICHAJE}
        proyectos={[]}
        clientes={[]}
        onGuardar={onGuardar}
        onCerrar={() => {}}
      />
    );

    await userEvent.click(screen.getByText("Guardar"));

    expect(onGuardar).toHaveBeenCalledTimes(1);
    const datos = onGuardar.mock.calls[0][0];
    // Verifica que los timestamps se construyen correctamente
    expect(datos.entrada).toBe("2024-06-10T09:00:00");
    expect(datos.salida).toBe("2024-06-10T17:30:00");
    expect(datos.proyecto).toBe("Web Acme");
    expect(datos.tipo).toBe("normal");
    expect(datos.facturado).toBe(false);
  });
});
