const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const money = (centavos: number | string) => ars.format(Number(centavos) / 100);
// Para líneas de comprobante: solo la cifra; el "$" va en el total.
const num = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const cifra = (centavos: number | string) => num.format(Math.round(Number(centavos) / 100));
export const CARGO_SERVICIO = 0.05; // comisión visible para el paciente

export function hace(dias: number) {
  if (dias <= 0) return "hoy";
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

// Fechas y horas, siempre en hora de Argentina.
export const TZ = "America/Argentina/Buenos_Aires";
const partesFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const partes = (d: Date | string) =>
  Object.fromEntries(partesFmt.formatToParts(new Date(d)).map((x) => [x.type, x.value.replace(".", "")]));

/** "mar 17/11 · 10:30" */
export function turnoTexto(d: Date | string) {
  const p = partes(d);
  return `${p.weekday} ${p.day}/${p.month} · ${p.hour}:${p.minute}`;
}
/** "10:30" */
export function horaTexto(d: Date | string) {
  const p = partes(d);
  return `${p.hour}:${p.minute}`;
}
/** "mar 17/11" a partir de "2026-11-17" */
export function diaTexto(ymd: string) {
  const p = partes(`${ymd}T12:00:00-03:00`);
  return `${p.weekday} ${p.day}/${p.month}`;
}
const largaFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
/** "martes 17 de noviembre · 10:30" */
export function fechaLarga(d: Date | string) {
  return `${largaFmt.format(new Date(d))} · ${horaTexto(d)}`;
}
