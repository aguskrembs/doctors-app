export type Vista = "lista" | "mapa";

/** Links del buscador del paciente: conservan filtro y vista. */
export function hrefBuscar(esp: string | undefined, vista: Vista) {
  const q = new URLSearchParams();
  if (esp) q.set("esp", esp);
  if (vista === "mapa") q.set("vista", "mapa");
  const s = q.toString();
  return s ? `/?${s}` : "/";
}
