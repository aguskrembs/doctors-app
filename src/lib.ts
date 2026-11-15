const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const money = (centavos: number | string) => ars.format(Number(centavos) / 100);
export const CARGO_SERVICIO = 0.05; // comisión visible para el paciente

export function hace(dias: number) {
  if (dias <= 0) return "hoy";
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
