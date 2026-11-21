"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { financiadores } from "@/modules/catalogo";
import { guardarPaciente, validarDatos, type DatosPaciente } from "@/modules/pacientes";
import { getSesion } from "@/sesion";

export type EstadoForm = { ok: boolean; errores: Partial<Record<keyof DatosPaciente, string>>; valores?: DatosPaciente };

/** Guarda "Mis datos" del paciente con sesión. El paciente sale de la sesión, nunca del formulario. */
export async function guardarMisDatos(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sesion = await getSesion();
  if (sesion.rol !== "paciente") return { ok: false, errores: { nombre: "Tu sesión no es de paciente." } };

  const db = await getDb();
  const texto = (k: string) => String(form.get(k) ?? "").trim();
  const financiador = texto("coberturaFinanciador");
  const validos = await financiadores(db);
  const datos: DatosPaciente = {
    nombre: texto("nombre"),
    dni: texto("dni"),
    telefono: texto("telefono"),
    email: texto("email") || null,
    coberturaFinanciador: validos.includes(financiador) ? financiador : null,
    coberturaPlan: texto("coberturaPlan") || null,
    nroAfiliado: texto("nroAfiliado") || null,
  };

  const errores = validarDatos(datos);
  if (Object.keys(errores).length) return { ok: false, errores, valores: datos };
  await guardarPaciente(db, sesion.pacienteId, datos);
  revalidatePath("/", "layout");
  return { ok: true, errores: {}, valores: datos };
}
