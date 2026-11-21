// API del módulo pacientes: datos personales y cobertura del paciente.
import type { PGlite } from "@electric-sql/pglite";
import { cifrar, descifrar } from "@/cifrado";

export type Paciente = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  dni: string | null; // descifrado; no mandarlo al cliente salvo a su dueño
  coberturaFinanciador: string | null;
  coberturaPlan: string | null;
  nroAfiliado: string | null;
};

export async function cargarPaciente(db: PGlite, id: number): Promise<Paciente | null> {
  const r = await db.query<{
    id: number; nombre: string; telefono: string | null; email: string | null; dni_cifrado: string | null;
    cobertura_financiador: string | null; cobertura_plan: string | null; nro_afiliado: string | null;
  }>(
    `SELECT id, nombre, telefono, email, dni_cifrado, cobertura_financiador, cobertura_plan, nro_afiliado
     FROM paciente WHERE id = $1 AND usuario_demo`, [id]);
  const p = r.rows[0];
  if (!p) return null;
  return {
    id: p.id, nombre: p.nombre, telefono: p.telefono, email: p.email, dni: descifrar(p.dni_cifrado),
    coberturaFinanciador: p.cobertura_financiador, coberturaPlan: p.cobertura_plan, nroAfiliado: p.nro_afiliado,
  };
}

export type DatosPaciente = Omit<Paciente, "id">;

/** Valida los datos de "Mis datos". Devuelve un mensaje por campo con error. */
export function validarDatos(d: DatosPaciente): Partial<Record<keyof DatosPaciente, string>> {
  const e: Partial<Record<keyof DatosPaciente, string>> = {};
  if (d.nombre.trim().length < 3) e.nombre = "Escribí tu nombre y apellido.";
  const dni = (d.dni ?? "").replace(/\D/g, "");
  if (dni.length < 7 || dni.length > 8) e.dni = "El DNI tiene 7 u 8 números.";
  if ((d.telefono ?? "").replace(/\D/g, "").length < 8) e.telefono = "Revisá el celular: tiene que tener al menos 8 números.";
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Revisá el email.";
  if (d.coberturaFinanciador) {
    if (!d.coberturaPlan?.trim()) e.coberturaPlan = "Indicá tu plan.";
    if (!d.nroAfiliado?.trim()) e.nroAfiliado = "Indicá tu número de afiliado.";
  }
  return e;
}

export async function guardarPaciente(db: PGlite, id: number, d: DatosPaciente) {
  const tieneCobertura = !!d.coberturaFinanciador;
  await db.query(
    `UPDATE paciente SET nombre = $2, telefono = $3, email = $4, dni_cifrado = $5,
            cobertura_financiador = $6, cobertura_plan = $7, nro_afiliado = $8
     WHERE id = $1 AND usuario_demo`,
    [id, d.nombre.trim(), d.telefono?.trim() ?? null, d.email?.trim() || null, cifrar((d.dni ?? "").replace(/\D/g, "")),
     tieneCobertura ? d.coberturaFinanciador : null, tieneCobertura ? d.coberturaPlan?.trim() : null, tieneCobertura ? d.nroAfiliado?.trim() : null],
  );
}
