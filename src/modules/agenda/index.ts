// API del módulo agenda: huecos libres, vencimiento de reservas y políticas.
import type { PGlite } from "@electric-sql/pglite";
import { turnoTexto } from "@/lib";
import { calcularGrilla, type Casilla, type Hueco } from "./huecos";

export { diaAR, lunesDe, sumarDias, type Casilla, type EstadoCasilla, type Hueco } from "./huecos";

const ACTIVOS = "('PENDIENTE_PAGO','CONFIRMADO','ATENDIDO')";
export const MINUTOS_PARA_PAGAR = 15;

/**
 * Libera las reservas que no se pagaron a tiempo. En producción lo hace un job
 * cada minuto (docs/02); en el prototipo corre antes de calcular o tomar huecos.
 */
export async function expirarPendientes(db: PGlite) {
  await db.query(
    "UPDATE turno SET estado = 'EXPIRADO' WHERE estado = 'PENDIENTE_PAGO' AND expira_en IS NOT NULL AND expira_en < now()",
  );
}

type Consulta = { profesionalId: number; consultorioId?: number; duracionMin: number; desde?: string; dias?: number };

/** Grilla del calendario: todas las casillas con su estado (libre, ocupado, pasado). */
export async function grillaDisponible(db: PGlite, o: Consulta): Promise<Casilla[]> {
  await expirarPendientes(db);
  const [reglas, ocupados] = await Promise.all([
    db.query<{ consultorio_id: number; dia_semana: number; hora_desde: string; hora_hasta: string }>(
      `SELECT d.consultorio_id, d.dia_semana, d.hora_desde::text AS hora_desde, d.hora_hasta::text AS hora_hasta
       FROM disponibilidad d JOIN consultorio c ON c.id = d.consultorio_id
       WHERE c.profesional_id = $1 AND ($2::int IS NULL OR c.id = $2)`,
      [o.profesionalId, o.consultorioId ?? null],
    ),
    db.query<{ inicio: Date; fin: Date }>(
      `SELECT lower(horario) AS inicio, upper(horario) AS fin FROM turno
       WHERE profesional_id = $1 AND estado IN ${ACTIVOS} AND upper(horario) > now()`,
      [o.profesionalId],
    ),
  ]);
  return calcularGrilla({
    reglas: reglas.rows.map((r) => ({ consultorioId: r.consultorio_id, diaSemana: r.dia_semana, desde: r.hora_desde, hasta: r.hora_hasta })),
    ocupados: ocupados.rows,
    duracionMin: o.duracionMin,
    ahora: new Date(),
    desde: o.desde,
    dias: o.dias ?? 14,
  });
}

/** Solo los huecos reservables (para "próximo turno" y validaciones). */
export async function huecosDisponibles(db: PGlite, o: Consulta): Promise<Hueco[]> {
  return (await grillaDisponible(db, o)).filter((c) => c.estado === "libre");
}

// Políticas de cancelación estandarizadas (docs/01).
export const POLITICAS: Record<string, { nombre: string; horas: number; despues: string }> = {
  FLEXIBLE: { nombre: "Flexible", horas: 24, despues: "Después se reintegra el 50%." },
  MODERADA: { nombre: "Moderada", horas: 48, despues: "Después no hay reintegro." },
  ESTRICTA: { nombre: "Estricta", horas: 72, despues: "Después no hay reintegro." },
};

/** Texto de la política aplicado a un turno concreto (o genérico si todavía no hay horario). */
export function textoPolitica(politica: string, inicio?: Date | null) {
  const p = POLITICAS[politica] ?? POLITICAS.FLEXIBLE;
  const hasta = inicio
    ? `hasta el ${turnoTexto(new Date(inicio.getTime() - p.horas * 3_600_000))}`
    : `hasta ${p.horas} h antes`;
  return `Política ${p.nombre.toLowerCase()}: cancelás o cambiás gratis ${hasta}. ${p.despues}`;
}
