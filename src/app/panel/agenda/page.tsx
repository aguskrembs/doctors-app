import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getSesion } from "@/sesion";

export const dynamic = "force-dynamic";
const TZ = "America/Argentina/Buenos_Aires";

async function crearTurno(form: FormData) {
  "use server";
  // El profesional sale de la sesión, nunca del formulario.
  const sesion = await getSesion();
  if (sesion.rol !== "profesional") redirect("/");
  const prof = sesion.profesionalId;
  const prestacion = Number(form.get("prestacion"));
  const paciente = Number(form.get("paciente"));
  const hora = String(form.get("hora"));
  const db = await getDb();
  try {
    await db.query(
      `INSERT INTO turno (profesional_id, consultorio_id, prestacion_id, paciente_id, horario, estado, origen)
       SELECT $1, (SELECT id FROM consultorio WHERE profesional_id = $1 ORDER BY id LIMIT 1), pr.id, $3,
              tstzrange(s.inicio, s.inicio + make_interval(mins => pr.duracion_min)), 'CONFIRMADO', 'PANEL'
       FROM prestacion pr,
            LATERAL (SELECT (((now() AT TIME ZONE '${TZ}')::date + $4::time) AT TIME ZONE '${TZ}') AS inicio) s
       WHERE pr.id = $2 AND pr.profesional_id = $1`,
      [prof, prestacion, paciente, hora],
    );
  } catch (e) {
    // 23P01 = exclusion_violation: la base impidió la superposición.
    if ((e as { code?: string }).code === "23P01") redirect(`/panel/agenda?error=ocupado&hora=${encodeURIComponent(hora)}`);
    throw e;
  }
  redirect("/panel/agenda?ok=1");
}

// Texto y clase visual por estado (ver docs/05 → Lenguaje visual de estados).
const ESTADO: Record<string, { texto: string; clase: string }> = {
  PENDIENTE_PAGO: { texto: "Esperando pago", clase: "pendiente" },
  CONFIRMADO: { texto: "Reservado", clase: "reservado" },
  ATENDIDO: { texto: "Atendido", clase: "atendido" },
  AUSENTE: { texto: "Ausente", clase: "ausente" },
  CANCELADO: { texto: "Cancelado", clase: "cancelado" },
  EXPIRADO: { texto: "No se pagó", clase: "cancelado" },
};

type Turno = { id: number; desde: string; hasta: string; paciente: string; prestacion: string; estado: string; origen: string };

export default async function Agenda({
  searchParams,
}: { searchParams: Promise<{ error?: string; ok?: string; hora?: string }> }) {
  const sp = await searchParams;
  const sesion = await getSesion();
  if (sesion.rol !== "profesional") redirect("/"); // también lo cubre panel/layout
  const db = await getDb();
  const prof = (await db.query<{ id: number; nombre: string; especialidad: string }>(
    "SELECT id, nombre, especialidad FROM profesional WHERE id = $1", [sesion.profesionalId])).rows[0];
  if (!prof) redirect("/");

  const [turnos, prests, pacs] = await Promise.all([
    db.query<Turno>(
      `SELECT t.id, to_char(lower(t.horario) AT TIME ZONE '${TZ}', 'HH24:MI') AS desde,
              to_char(upper(t.horario) AT TIME ZONE '${TZ}', 'HH24:MI') AS hasta,
              pa.nombre AS paciente, pr.nombre AS prestacion, t.estado, t.origen
       FROM turno t JOIN paciente pa ON pa.id = t.paciente_id JOIN prestacion pr ON pr.id = t.prestacion_id
       WHERE t.profesional_id = $1
         AND (lower(t.horario) AT TIME ZONE '${TZ}')::date = (now() AT TIME ZONE '${TZ}')::date
       ORDER BY lower(t.horario)`, [prof.id]),
    db.query<{ id: number; nombre: string; duracion_min: number }>(
      "SELECT id, nombre, duracion_min FROM prestacion WHERE profesional_id = $1 ORDER BY id", [prof.id]),
    db.query<{ id: number; nombre: string }>("SELECT id, nombre FROM paciente ORDER BY nombre"),
  ]);

  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

  return (
    <>
      <section className="hero">
        <h1>Agenda de hoy</h1>
        <p className="muted">{hoy.charAt(0).toUpperCase() + hoy.slice(1)}</p>
      </section>

      <div className="agenda">
        <section className="panel">
          <h2>{prof.nombre} <span className="muted">· {prof.especialidad}</span></h2>
          {turnos.rows.length === 0 && <p className="muted">No hay turnos cargados para hoy.</p>}
          <ol className="turnos">
            {turnos.rows.map((t) => {
              const e = ESTADO[t.estado] ?? { texto: t.estado, clase: "" };
              return (
              <li key={t.id} className={`turno ${e.clase}`}>
                <span className="mono hora">{t.desde}–{t.hasta}</span>
                <div>
                  <strong>{t.paciente}</strong>
                  <div className="muted small">{t.prestacion}</div>
                </div>
                <span className={`estado ${e.clase}`}>{e.texto}</span>
                <span className="muted small">{t.origen === "ONLINE" ? "Online" : "Panel"}</span>
              </li>
              );
            })}
          </ol>
        </section>

        <section className="panel">
          <h2>Cargar turno</h2>
          <form action={crearTurno} className="form">
            <label>Paciente
              <select name="paciente" required>{pacs.rows.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
            </label>
            <label>Prestación
              <select name="prestacion" required>{prests.rows.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({x.duracion_min} min)</option>)}</select>
            </label>
            <label>Hora
              <input type="time" name="hora" defaultValue={sp.hora ?? "09:15"} required />
            </label>
            <button className="btn" type="submit">Agregar a la agenda</button>
          </form>
          {sp.error === "ocupado" && (
            <p className="alert err">Ese horario se superpone con otro turno. La base de datos lo rechazó, probá con otra hora.</p>
          )}
          {sp.ok && <p className="alert ok">Turno agregado.</p>}
          <p className="muted small">Probá cargar un turno a las 09:15: choca con el de las 9:00 de la Dra. Fernández.</p>
        </section>
      </div>
    </>
  );
}
