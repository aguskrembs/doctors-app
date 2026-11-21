import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { hace, money } from "@/lib";
import { financiadores } from "@/modules/catalogo";
import { POLITICAS } from "@/modules/agenda";
import { cargarPaciente } from "@/modules/pacientes";
import { getSesion } from "@/sesion";
import { FormPaciente } from "./form-paciente";

export const dynamic = "force-dynamic";

// "Mis datos" según el rol: el paciente edita sus datos y su cobertura; el profesional
// ve su ficha (la edición de consultorios, horarios y precios va en Ajustes).
export default async function MisDatos() {
  const sesion = await getSesion();
  if (sesion.rol === "visitante") redirect("/");
  const db = await getDb();

  if (sesion.rol === "paciente") {
    const p = await cargarPaciente(db, sesion.pacienteId);
    if (!p) redirect("/");
    const { id: _id, ...inicial } = p;
    return (
      <>
        <section className="hero">
          <h1>Mis datos</h1>
          <p className="muted">Los usamos para tus reservas: no te los volvemos a pedir en cada turno.</p>
        </section>
        <div className="panel mis-datos">
          <FormPaciente inicial={inicial} financiadores={await financiadores(db)} />
        </div>
      </>
    );
  }

  const id = sesion.profesionalId;
  const [prof, conss, prests] = await Promise.all([
    db.query<{ nombre: string; especialidad: string; matricula_ok: boolean; matricula_jurisdiccion: string | null; matricula_numero: string | null; politica_cancelacion: string }>(
      "SELECT nombre, especialidad, matricula_ok, matricula_jurisdiccion, matricula_numero, politica_cancelacion FROM profesional WHERE id = $1", [id]),
    db.query<{ id: number; nombre: string; barrio: string; dias: string }>(
      "SELECT id, nombre, barrio, dias FROM consultorio WHERE profesional_id = $1 ORDER BY id", [id]),
    db.query<{ nombre: string; duracion_min: number; monto_centavos: string; dias: number }>(
      `SELECT DISTINCT ON (pr.id) pr.nombre, pr.duracion_min, p.monto_centavos,
              floor(extract(epoch FROM now() - p.vigente_desde) / 86400)::int AS dias
       FROM prestacion pr JOIN precio p ON p.prestacion_id = pr.id
       WHERE pr.profesional_id = $1 ORDER BY pr.id, p.vigente_desde DESC`, [id]),
  ]);
  const p = prof.rows[0];
  if (!p) redirect("/");
  const politica = POLITICAS[p.politica_cancelacion] ?? POLITICAS.FLEXIBLE;

  return (
    <>
      <section className="hero">
        <h1>Mis datos</h1>
        <p className="muted">Así te ven los pacientes en tu perfil.</p>
      </section>
      <div className="ficha">
        <section className="panel">
          <h2>{p.nombre}</h2>
          <dl className="resumen-datos">
            <div><dt>Especialidad</dt><dd>{p.especialidad}</dd></div>
            <div>
              <dt>Matrícula</dt>
              <dd className="matricula">
                <span className="mono">{p.matricula_numero ?? "—"}</span> · {p.matricula_jurisdiccion ?? "Sin jurisdicción"}{" "}
                {p.matricula_ok ? <span className="badge ok">Verificada</span> : <span className="badge">En verificación</span>}
              </dd>
            </div>
            <div><dt>Cancelación</dt><dd>Política {politica.nombre.toLowerCase()}: gratis hasta {politica.horas} h antes. {politica.despues}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2>Consultorios</h2>
          <ul className="lista-ficha">
            {conss.rows.map((c) => <li key={c.id}><strong>{c.nombre}</strong><span className="muted">{c.barrio} · {c.dias}</span></li>)}
          </ul>
        </section>

        <section className="panel">
          <h2>Prestaciones</h2>
          <ul className="lista-ficha">
            {prests.rows.map((x) => (
              <li key={x.nombre}>
                <strong>{x.nombre} <span className="muted">· {x.duracion_min} min</span></strong>
                <span><span className="mono">{money(x.monto_centavos)}</span> <span className={x.dias > 30 ? "fresh stale" : "fresh"}>· actualizado {hace(x.dias)}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <p className="aviso-paso small">Para cambiar consultorios, horarios o precios vas a usar Ajustes (próximamente).</p>
      </div>
    </>
  );
}
