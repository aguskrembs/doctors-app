import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { huecosDisponibles } from "@/modules/agenda";
import { cargarPaciente } from "@/modules/pacientes";
import { getSesion, inicio } from "@/sesion";
import { HeroLanding, SeccionesLanding } from "./landing";
import { hrefBuscar, type Vista } from "./href-buscar";
import { TarjetaProfesional, type ProfesionalVM } from "./tarjeta-profesional";
import { VistaMapa } from "./vista-mapa";

export const dynamic = "force-dynamic";

type Prof = { id: number; nombre: string; especialidad: string; matricula_ok: boolean };
type Prest = { profesional_id: number; nombre: string; duracion_min: number; monto_centavos: string; dias: number };
type Cons = { id: number; profesional_id: number; nombre: string; barrio: string; dias: string; lat: number; lng: number };
type Cob = { profesional_id: number; financiador: string; modalidad: string; plus_centavos: string | null };

// `/` según quién mira: el visitante ve el landing con el buscador adentro; el paciente,
// solo el buscador (sin marketing). Los profesionales tienen su inicio en /panel.
export default async function Inicio({ searchParams }: { searchParams: Promise<{ esp?: string; vista?: string }> }) {
  const sesion = await getSesion();
  if (sesion.rol === "profesional") redirect(inicio(sesion));

  const sp = await searchParams;
  const vista: Vista = sp.vista === "mapa" ? "mapa" : "lista";
  const db = await getDb();
  const paciente = sesion.rol === "paciente" ? await cargarPaciente(db, sesion.pacienteId) : null;
  const esVisitante = !paciente;

  const [profs, prests, conss, cobs] = await Promise.all([
    db.query<Prof>("SELECT id, nombre, especialidad, matricula_ok FROM profesional ORDER BY especialidad"),
    db.query<Prest>(`
      SELECT DISTINCT ON (pr.id) pr.profesional_id, pr.nombre, pr.duracion_min, p.monto_centavos,
             floor(extract(epoch FROM now() - p.vigente_desde) / 86400)::int AS dias
      FROM prestacion pr JOIN precio p ON p.prestacion_id = pr.id
      ORDER BY pr.id, p.vigente_desde DESC`),
    db.query<Cons>("SELECT id, profesional_id, nombre, barrio, dias, lat, lng FROM consultorio ORDER BY id"),
    db.query<Cob>("SELECT profesional_id, financiador, modalidad, plus_centavos FROM cobertura ORDER BY id"),
  ]);

  const especialidades = [...new Set(profs.rows.map((p) => p.especialidad))];
  const esp = sp.esp && especialidades.includes(sp.esp) ? sp.esp : undefined;

  const filtrados = profs.rows.filter((p) => !esp || p.especialidad === esp);

  // Próximo turno libre: el primer hueco de su prestación más corta, en cualquier consultorio.
  const proximos = await Promise.all(filtrados.map(async (p) => {
    const duraciones = prests.rows.filter((x) => x.profesional_id === p.id).map((x) => x.duracion_min);
    if (duraciones.length === 0) return null;
    const [h] = await huecosDisponibles(db, { profesionalId: p.id, duracionMin: Math.min(...duraciones) });
    return h ? h.inicio.toISOString() : null;
  }));

  const profesionales: ProfesionalVM[] = filtrados
    .map((p, i) => ({
      id: p.id,
      nombre: p.nombre,
      especialidad: p.especialidad,
      verificado: p.matricula_ok,
      prestaciones: prests.rows.filter((x) => x.profesional_id === p.id).map((x) => ({
        nombre: x.nombre, duracionMin: x.duracion_min, montoCentavos: Number(x.monto_centavos), dias: x.dias,
      })),
      consultorios: conss.rows.filter((c) => c.profesional_id === p.id).map((c) => ({
        id: c.id, nombre: c.nombre, barrio: c.barrio, dias: c.dias, lat: Number(c.lat), lng: Number(c.lng),
      })),
      coberturas: cobs.rows.filter((c) => c.profesional_id === p.id).map((c) => ({
        financiador: c.financiador, modalidad: c.modalidad, plusCentavos: c.plus_centavos === null ? null : Number(c.plus_centavos),
      })),
      proximoTurno: proximos[i],
    }));

  // Cobertura para las tarjetas: null = particular; undefined = visitante (sin franja).
  const coberturaPaciente = paciente ? paciente.coberturaFinanciador : undefined;
  const Titulo = esVisitante ? "h2" : "h1";
  const muestra = profesionales.flatMap((p) => p.prestaciones.map((x) => ({ p, x }))).sort((a, b) => a.x.dias - b.x.dias)[0];

  return (
    <>
      {esVisitante && vista === "lista" && <HeroLanding muestra={muestra && { profesional: muestra.p.nombre, especialidad: muestra.p.especialidad, ...muestra.x }} />}

      <section className="hero buscador" id="buscar">
        <div className="titulo-fila">
          <Titulo className={esVisitante ? "titulo-buscador" : undefined}>
            {paciente ? `Hola, ${paciente.nombre.split(" ")[0]}` : "Buscá un profesional"}
          </Titulo>
          <nav className="switch-vista" aria-label="Cambiar vista">
            <Link href={hrefBuscar(esp, "lista")} aria-current={vista === "lista" ? "page" : undefined} scroll={false}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" />
              </svg>
              Lista
            </Link>
            <Link href={hrefBuscar(esp, "mapa")} aria-current={vista === "mapa" ? "page" : undefined} scroll={false}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7" /><path d="M9 4v13" /><path d="M15 7v13" />
              </svg>
              Mapa
            </Link>
          </nav>
        </div>
        {vista === "lista" && (
          <>
            <p className="muted">
              {paciente
                ? paciente.coberturaFinanciador
                  ? `Te mostramos qué cubre tu ${paciente.coberturaFinanciador} con cada profesional.`
                  : "Precio vigente, coberturas y horarios antes de pedir turno."
                : "Precio vigente, coberturas y horarios antes de pedir turno."}
            </p>
            <div className="chips">
              <Link href={hrefBuscar(undefined, "lista")} className={!esp ? "chip on" : "chip"}>Todas</Link>
              {especialidades.map((e) => (
                <Link key={e} href={hrefBuscar(e, "lista")} className={esp === e ? "chip on" : "chip"}>{e}</Link>
              ))}
            </div>
          </>
        )}
      </section>

      {vista === "mapa" ? (
        <VistaMapa
          profesionales={profesionales}
          especialidades={especialidades.map((e) => ({ nombre: e, cantidad: profs.rows.filter((p) => p.especialidad === e).length }))}
          totalProfesionales={profs.rows.length}
          esp={esp}
          coberturaPaciente={coberturaPaciente}
        />
      ) : (
        <section className="cards">
          {profesionales.map((p) => (
            <TarjetaProfesional key={p.id} p={p} reservarHref={`/reservar/${p.id}`} coberturaPaciente={coberturaPaciente} />
          ))}
        </section>
      )}

      {esVisitante && vista === "lista" && <SeccionesLanding />}
    </>
  );
}
