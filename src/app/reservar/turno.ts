import { getDb } from "@/db";
import { getSesion } from "@/sesion";
import { expirarPendientes } from "@/modules/agenda";

export type TurnoReserva = {
  token: string; estado: string; inicio: Date; expira_en: Date | null;
  profesional_id: number; profesional: string; especialidad: string;
  prestacion_id: number; prestacion: string; duracion_min: number;
  consultorio_id: number; consultorio: string; barrio: string;
  precio_centavos: string; cargo_centavos: string; politica_cancelacion: string; paciente: string; paciente_id: number;
};

/**
 * Turno de una reserva online, buscado por su token (las URLs del paciente nunca usan el id).
 * Solo lo devuelve si es del paciente con sesión: tener el link no alcanza.
 */
export async function turnoPorToken(token: string) {
  const db = await getDb();
  await expirarPendientes(db);
  const r = await db.query<TurnoReserva>(
    `SELECT t.token, t.estado, lower(t.horario) AS inicio, t.expira_en,
            p.id AS profesional_id, p.nombre AS profesional, p.especialidad,
            pr.id AS prestacion_id, pr.nombre AS prestacion, pr.duracion_min,
            c.id AS consultorio_id, c.nombre AS consultorio, c.barrio,
            t.precio_centavos, t.cargo_centavos, t.politica_cancelacion, pa.nombre AS paciente, pa.id AS paciente_id
     FROM turno t
     JOIN profesional p ON p.id = t.profesional_id
     JOIN prestacion pr ON pr.id = t.prestacion_id
     JOIN consultorio c ON c.id = t.consultorio_id
     JOIN paciente pa ON pa.id = t.paciente_id
     WHERE t.token = $1 AND t.origen = 'ONLINE'`,
    [token],
  );
  const sesion = await getSesion();
  const turno = r.rows[0];
  const esSuyo = turno && sesion.rol === "paciente" && sesion.pacienteId === turno.paciente_id;
  return { db, turno: esSuyo ? turno : undefined };
}
