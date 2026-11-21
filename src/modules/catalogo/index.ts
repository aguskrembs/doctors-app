// API del módulo catálogo: prestaciones, precios y coberturas aceptadas.
export { coberturaPara, type CoberturaProfesional, type ResultadoCobertura } from "./cobertura";

import type { PGlite } from "@electric-sql/pglite";

/** Financiadores con los que trabaja algún profesional (para elegir en "Mis datos"). */
export async function financiadores(db: PGlite) {
  return (await db.query<{ financiador: string }>("SELECT DISTINCT financiador FROM cobertura ORDER BY financiador")).rows.map((r) => r.financiador);
}
