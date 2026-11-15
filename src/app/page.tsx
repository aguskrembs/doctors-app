import Link from "next/link";
import { getDb } from "@/db";
import { CARGO_SERVICIO, hace, money } from "@/lib";

export const dynamic = "force-dynamic";

type Prof = { id: number; nombre: string; especialidad: string; matricula_ok: boolean };
type Prest = { profesional_id: number; nombre: string; duracion_min: number; monto_centavos: string; dias: number };
type Cons = { profesional_id: number; nombre: string; barrio: string; dias: string };
type Cob = { profesional_id: number; financiador: string; modalidad: string; plus_centavos: string | null };

export default async function Home({ searchParams }: { searchParams: Promise<{ esp?: string }> }) {
  const { esp } = await searchParams;
  const db = await getDb();

  const [profs, prests, conss, cobs] = await Promise.all([
    db.query<Prof>("SELECT id, nombre, especialidad, matricula_ok FROM profesional ORDER BY especialidad"),
    db.query<Prest>(`
      SELECT DISTINCT ON (pr.id) pr.profesional_id, pr.nombre, pr.duracion_min, p.monto_centavos,
             floor(extract(epoch FROM now() - p.vigente_desde) / 86400)::int AS dias
      FROM prestacion pr JOIN precio p ON p.prestacion_id = pr.id
      ORDER BY pr.id, p.vigente_desde DESC`),
    db.query<Cons>("SELECT profesional_id, nombre, barrio, dias FROM consultorio ORDER BY id"),
    db.query<Cob>("SELECT profesional_id, financiador, modalidad, plus_centavos FROM cobertura ORDER BY id"),
  ]);

  const especialidades = [...new Set(profs.rows.map((p) => p.especialidad))];
  const lista = profs.rows.filter((p) => !esp || p.especialidad === esp);

  return (
    <>
      <section className="hero">
        <h1>Encontrá un profesional y mirá cuánto sale antes de pedir turno</h1>
        <p className="muted">Precios vigentes con su fecha, coberturas y horarios. Datos de ejemplo del piloto.</p>
        <div className="chips">
          <Link href="/" className={!esp ? "chip on" : "chip"}>Todas</Link>
          {especialidades.map((e) => (
            <Link key={e} href={`/?esp=${encodeURIComponent(e)}`} className={esp === e ? "chip on" : "chip"}>{e}</Link>
          ))}
        </div>
      </section>

      <section className="cards">
        {lista.map((p) => (
          <article key={p.id} className="card">
            <header>
              <div>
                <h2>{p.nombre}</h2>
                <span className="muted">{p.especialidad}</span>
              </div>
              {p.matricula_ok ? <span className="badge ok">Matrícula verificada</span> : <span className="badge">En verificación</span>}
            </header>

            <ul className="prest">
              {prests.rows.filter((x) => x.profesional_id === p.id).map((x) => {
                const monto = Number(x.monto_centavos);
                const vieja = x.dias > 30;
                return (
                  <li key={x.nombre}>
                    <div>
                      <strong>{x.nombre}</strong>
                      <span className="muted"> · {x.duracion_min} min</span>
                      <div className={vieja ? "fresh stale" : "fresh"}>Precio actualizado {hace(x.dias)}</div>
                    </div>
                    <div className="precio">
                      <span className="mono big">{money(monto)}</span>
                      <span className="muted small">+ {money(monto * CARGO_SERVICIO)} cargo de servicio</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="meta">
              {conss.rows.filter((c) => c.profesional_id === p.id).map((c) => (
                <div key={c.nombre}><span className="muted">📍</span> {c.barrio} · {c.dias}</div>
              ))}
              {cobs.rows.filter((c) => c.profesional_id === p.id).map((c) => (
                <div key={c.financiador} className="small">
                  <span className="muted">Cobertura:</span> {c.financiador} ·{" "}
                  {c.modalidad === "CONVENIO" ? `convenio, plus ${money(c.plus_centavos ?? 0)}` : "factura para reintegro"}
                </div>
              ))}
            </div>
            <Link href={`/agenda?p=${p.id}`} className="btn">Ver agenda de hoy</Link>
          </article>
        ))}
      </section>
    </>
  );
}
