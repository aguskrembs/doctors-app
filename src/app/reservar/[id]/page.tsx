import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { CARGO_SERVICIO, diaTexto, horaTexto, money, turnoTexto } from "@/lib";
import {
  diaAR, grillaDisponible, huecosDisponibles, lunesDe, sumarDias, MINUTOS_PARA_PAGAR, type Casilla,
} from "@/modules/agenda";
import { cargarPaciente } from "@/modules/pacientes";
import { getSesion } from "@/sesion";
import { FranjaCobertura } from "../../tarjeta-profesional";
import { ResumenTurno } from "../resumen-turno";

export const dynamic = "force-dynamic";
const SEMANAS = 4; // cuánto hacia adelante se puede reservar

type Prof = { id: number; nombre: string; especialidad: string; politica_cancelacion: string };
type Prest = { id: number; nombre: string; duracion_min: number; monto_centavos: string };
type Cons = { id: number; nombre: string; barrio: string };
type Cob = { financiador: string; modalidad: string; plus_centavos: string | null };
type SP = { prestacion?: string; consultorio?: string; semana?: string; inicio?: string; error?: string };

async function cargar(profId: number) {
  const db = await getDb();
  const [prof, prests, conss, cobs] = await Promise.all([
    db.query<Prof>("SELECT id, nombre, especialidad, politica_cancelacion FROM profesional WHERE id = $1", [profId]),
    db.query<Prest>(
      `SELECT pr.id, pr.nombre, pr.duracion_min, p.monto_centavos
       FROM prestacion pr
       JOIN LATERAL (SELECT monto_centavos FROM precio WHERE prestacion_id = pr.id ORDER BY vigente_desde DESC LIMIT 1) p ON true
       WHERE pr.profesional_id = $1 ORDER BY pr.id`, [profId]),
    db.query<Cons>("SELECT id, nombre, barrio FROM consultorio WHERE profesional_id = $1 ORDER BY id", [profId]),
    db.query<Cob>("SELECT financiador, modalidad, plus_centavos FROM cobertura WHERE profesional_id = $1", [profId]),
  ]);
  const coberturas = cobs.rows.map((c) => ({ financiador: c.financiador, modalidad: c.modalidad, plusCentavos: c.plus_centavos === null ? null : Number(c.plus_centavos) }));
  return { db, prof: prof.rows[0], prests: prests.rows, conss: conss.rows, coberturas };
}

/** Toma el horario: crea el turno PENDIENTE_PAGO, que lo bloquea 15 minutos mientras paga. */
async function reservar(form: FormData) {
  "use server";
  // El paciente sale de la sesión, nunca del formulario. Un visitante no puede reservar.
  const sesion = await getSesion();
  if (sesion.rol !== "paciente") redirect("/");
  const profId = Number(form.get("prof"));
  const prestId = Number(form.get("prestacion"));
  const consId = Number(form.get("consultorio"));
  const inicio = new Date(String(form.get("inicio")));
  const volver = (error: string) => `/reservar/${profId}?prestacion=${prestId}&consultorio=${consId}&error=${error}`;

  const { db, prof, prests, conss } = await cargar(profId);
  const prest = prests.find((x) => x.id === prestId);
  if (!prof || !prest || !conss.some((c) => c.id === consId) || isNaN(inicio.getTime())) redirect("/");
  const paciente = await cargarPaciente(db, sesion.pacienteId);
  if (!paciente) redirect("/");
  // Sin celular no hay avisos del turno: se completa en Mis datos.
  if ((paciente.telefono ?? "").replace(/\D/g, "").length < 8) redirect(volver("datos"));

  // El horario tiene que seguir libre (además, la base lo garantiza con EXCLUDE).
  const libres = await huecosDisponibles(db, { profesionalId: profId, consultorioId: consId, duracionMin: prest.duracion_min, dias: SEMANAS * 7 });
  if (!libres.some((h) => h.inicio.getTime() === inicio.getTime())) redirect(volver("ocupado"));

  const monto = Number(prest.monto_centavos);
  const cargo = Math.round(monto * CARGO_SERVICIO);
  let token: string;
  try {
    const t = await db.query<{ token: string }>(
      `INSERT INTO turno (profesional_id, consultorio_id, prestacion_id, paciente_id, horario, estado, origen,
                          precio_centavos, cargo_centavos, politica_cancelacion, expira_en)
       VALUES ($1, $2, $3, $4, tstzrange($5::timestamptz, $5::timestamptz + make_interval(mins => $6::int)),
               'PENDIENTE_PAGO', 'ONLINE', $7, $8, $9, now() + make_interval(mins => $10::int))
       RETURNING token`,
      [profId, consId, prestId, paciente.id, inicio.toISOString(), prest.duracion_min, monto, cargo, prof.politica_cancelacion, MINUTOS_PARA_PAGAR],
    );
    token = t.rows[0].token;
  } catch (e) {
    // 23P01 = exclusion_violation: otro paciente lo tomó en el mismo instante.
    if ((e as { code?: string }).code === "23P01") redirect(volver("ocupado"));
    throw e;
  }
  redirect(`/reservar/pago/${token}`);
}

const ERRORES: Record<string, string> = {
  ocupado: "Ese horario se acaba de ocupar. Elegí otro.",
  pago: "El pago no se aprobó y el horario se liberó. Podés elegirlo de nuevo si sigue libre.",
  vencido: "Pasaron 15 minutos sin pagar y el horario se liberó.",
  datos: "Necesitamos tu celular para avisarte del turno. Completalo en Mis datos.",
};

export default async function Reservar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const profId = Number((await params).id);
  const sp = await searchParams;
  const sesion = await getSesion();
  const { db, prof, prests, conss, coberturas } = await cargar(profId);
  if (!prof) notFound();
  const prest = prests.find((x) => x.id === Number(sp.prestacion)) ?? prests[0];
  const cons = conss.find((c) => c.id === Number(sp.consultorio)) ?? conss[0];
  if (!prest || !cons) notFound();

  // Visitante: solo el próximo turno disponible. El calendario completo no se calcula ni se
  // manda al navegador, para cuidar la agenda del profesional (ver docs/05 → Visitante).
  if (sesion.rol !== "paciente") {
    const duracion = Math.min(...prests.map((x) => x.duracion_min));
    const [proximo] = await huecosDisponibles(db, { profesionalId: prof.id, duracionMin: duracion, dias: SEMANAS * 7 });
    return <PuertaVisitante prof={prof} proximo={proximo?.inicio ?? null} />;
  }
  const paciente = await cargarPaciente(db, sesion.pacienteId);
  if (!paciente) redirect("/");

  // Semana visible: la pedida (dentro del rango) o la del primer hueco libre.
  const lunesHoy = lunesDe(diaAR(new Date()));
  const ultimoLunes = sumarDias(lunesHoy, 7 * (SEMANAS - 1));
  let semana = /^\d{4}-\d{2}-\d{2}$/.test(sp.semana ?? "") ? lunesDe(sp.semana!) : undefined;
  if (semana && (semana < lunesHoy || semana > ultimoLunes)) semana = undefined;
  if (!semana) {
    const [primero] = await huecosDisponibles(db, { profesionalId: prof.id, consultorioId: cons.id, duracionMin: prest.duracion_min, dias: SEMANAS * 7 });
    semana = primero ? lunesDe(diaAR(primero.inicio)) : lunesHoy;
  }

  const casillas = await grillaDisponible(db, {
    profesionalId: prof.id, consultorioId: cons.id, duracionMin: prest.duracion_min, desde: semana, dias: 7,
  });
  const inicioPedido = sp.inicio ? new Date(sp.inicio) : null;
  const elegida = inicioPedido && casillas.find((c) => c.estado === "libre" && c.inicio.getTime() === inicioPedido.getTime());

  // Calendario: una columna por día con atención y una fila por horario.
  const dias = [...new Set(casillas.map((c) => diaAR(c.inicio)))];
  const horas = [...new Set(casillas.map((c) => horaTexto(c.inicio)))].sort();
  const celda = new Map(casillas.map((c) => [`${diaAR(c.inicio)} ${horaTexto(c.inicio)}`, c]));

  const href = (c: Partial<SP>) => {
    const q = new URLSearchParams({ prestacion: String(prest.id), consultorio: String(cons.id), semana });
    for (const [k, v] of Object.entries(c)) v === undefined ? q.delete(k) : q.set(k, v);
    return `/reservar/${prof.id}?${q}`;
  };
  const monto = Number(prest.monto_centavos);
  const cargo = Math.round(monto * CARGO_SERVICIO);
  const rangoSemana = `${diaTexto(semana).slice(4)} al ${diaTexto(sumarDias(semana, 6)).slice(4)}`;

  return (
    <>
      <section className="hero">
        <Link href="/" className="volver small">← Volver al buscador</Link>
        <h1>Reservá con {prof.nombre}</h1>
        <p className="muted">{prof.especialidad}</p>
      </section>

      {sp.error && ERRORES[sp.error] && <p className="alert err" role="alert">{ERRORES[sp.error]}</p>}

      <div className="reserva">
        <div className="reserva-pasos">
          <section className="paso">
            <h2><span className="paso-n mono">1</span> Qué y dónde</h2>
            <div className="paso-grupo">
              <span className="paso-label">Prestación</span>
              <div className="chips">
                {prests.map((x) => (
                  <Link key={x.id} href={href({ prestacion: String(x.id), semana: undefined, inicio: undefined })} className={x.id === prest.id ? "chip on" : "chip"} scroll={false}>
                    {x.nombre} · {x.duracion_min}&apos; · {money(Number(x.monto_centavos))}
                  </Link>
                ))}
              </div>
            </div>
            <div className="paso-grupo">
              <span className="paso-label">Consultorio</span>
              <div className="chips">
                {conss.map((c) => (
                  <Link key={c.id} href={href({ consultorio: String(c.id), semana: undefined, inicio: undefined })} className={c.id === cons.id ? "chip on" : "chip"} scroll={false}>
                    {c.nombre} · {c.barrio}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="paso">
            <h2><span className="paso-n mono">2</span> Día y horario</h2>
            <div className="semana-nav">
              {semana > lunesHoy
                ? <Link href={href({ semana: sumarDias(semana, -7), inicio: undefined })} className="semana-flecha" aria-label="Semana anterior" scroll={false}>‹</Link>
                : <span className="semana-flecha off" aria-hidden="true">‹</span>}
              <span className="semana-rango">Semana del {rangoSemana}</span>
              {semana < ultimoLunes
                ? <Link href={href({ semana: sumarDias(semana, 7), inicio: undefined })} className="semana-flecha" aria-label="Semana siguiente" scroll={false}>›</Link>
                : <span className="semana-flecha off" aria-hidden="true">›</span>}
            </div>

            {dias.length === 0 ? (
              <p className="muted calendario-vacio">No atiende esta semana en {cons.barrio}. Probá con otra semana u otro consultorio.</p>
            ) : (
              <div className="calendario-scroll">
                <div className="calendario" style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(76px, 1fr))` }} role="grid" aria-label={`Horarios de ${prest.duracion_min} minutos`}>
                  {dias.map((d) => <div key={d} className="cal-dia" role="columnheader">{diaTexto(d)}</div>)}
                  {horas.map((h) => dias.map((d) => {
                    const c = celda.get(`${d} ${h}`);
                    return <Celda key={`${d}${h}`} c={c} elegida={elegida} href={c ? `${href({ inicio: c.inicio.toISOString() })}#resumen` : ""} />;
                  }))}
                </div>
              </div>
            )}
            <div className="cal-leyenda small">
              <span><i className="cal-muestra libre" /> Libre</span>
              <span><i className="cal-muestra ocupada" /> Ocupado</span>
              <span><i className="cal-muestra pasada" /> No disponible</span>
              <span className="muted">Turnos de {prest.duracion_min} min</span>
            </div>
          </section>

          {elegida && (
            // Solo lleva qué, dónde y cuándo: el paciente sale de la sesión.
            <form id="form-reserva" action={reservar} hidden>
              <input type="hidden" name="prof" value={prof.id} />
              <input type="hidden" name="prestacion" value={prest.id} />
              <input type="hidden" name="consultorio" value={cons.id} />
              <input type="hidden" name="inicio" value={elegida.inicio.toISOString()} />
            </form>
          )}
        </div>

        <aside className="reserva-resumen" id="resumen">
          <ResumenTurno
            paciente={paciente}
            cobertura={<FranjaCobertura financiador={paciente.coberturaFinanciador} coberturas={coberturas} />}
            profesional={prof.nombre} especialidad={prof.especialidad}
            prestacion={prest.nombre} duracionMin={prest.duracion_min}
            consultorio={cons.nombre} barrio={cons.barrio}
            inicio={elegida ? elegida.inicio : null}
            montoCentavos={monto} cargoCentavos={cargo} politica={prof.politica_cancelacion}
          >
            {elegida ? (
              <>
                <button type="submit" form="form-reserva" className="btn btn-pagar">Pagar {money(monto + cargo)} con Mercado Pago</button>
                <p className="muted small">El horario queda reservado {MINUTOS_PARA_PAGAR} minutos mientras pagás.</p>
              </>
            ) : (
              <p className="aviso-paso small">Elegí un horario libre en el calendario para continuar.</p>
            )}
          </ResumenTurno>
        </aside>
      </div>
    </>
  );
}

function Celda({ c, elegida, href }: { c?: Casilla; elegida?: Casilla | null | false; href: string }) {
  if (!c) return <div className="cal-celda vacia" role="gridcell" />;
  const hora = horaTexto(c.inicio);
  if (c.estado === "ocupado") return <div className="cal-celda ocupada mono" role="gridcell" aria-disabled="true" title="Ocupado">{hora}</div>;
  if (c.estado === "pasado") return <div className="cal-celda pasada mono" role="gridcell" aria-disabled="true" title="Ya no disponible">{hora}</div>;
  const on = elegida && elegida.inicio.getTime() === c.inicio.getTime();
  return (
    <div role="gridcell">
      <Link href={href} className={on ? "cal-celda libre on mono" : "cal-celda libre mono"} aria-current={on ? "true" : undefined} scroll={false}>{hora}</Link>
    </div>
  );
}

function PuertaVisitante({ prof, proximo }: { prof: Prof; proximo: Date | null }) {
  return (
    <>
      <section className="hero">
        <Link href="/" className="volver small">← Volver al buscador</Link>
        <h1>Reservá con {prof.nombre}</h1>
        <p className="muted">{prof.especialidad}</p>
      </section>
      <section className="paso puerta">
        <div className="proximo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="2" /><path d="M16 3v4M8 3v4M4 11h16" />
          </svg>
          <div>
            <span className="proximo-label">Próximo turno disponible</span>
            <span className="proximo-fecha mono">{proximo ? turnoTexto(proximo) : "Sin turnos en las próximas semanas"}</span>
          </div>
        </div>
        <h2>Necesitás una cuenta para reservar</h2>
        <p className="muted">Con tu cuenta ves todos los horarios libres, reservás en un paso y te mostramos qué cubre tu prepaga.</p>
        <p className="aviso-paso small">Demo: elegí un paciente en <strong>Ver como</strong>, arriba a la derecha.</p>
      </section>
    </>
  );
}
