import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { money } from "@/lib";
import { getSesion } from "@/sesion";
import { CuentaRegresiva } from "../../cuenta-regresiva";
import { ResumenTurno } from "../../resumen-turno";
import { turnoPorToken } from "../../turno";

export const dynamic = "force-dynamic";

// PROTOTIPO: simula la vuelta de Mercado Pago. En producción esto lo resuelve el
// webhook idempotente de MP (docs/02, flujo 1); acá dos botones hacen de webhook.
async function simularPago(form: FormData) {
  "use server";
  if ((await getSesion()).rol !== "paciente") redirect("/");
  const token = String(form.get("token"));
  const aprobado = form.get("resultado") === "aprobado";
  const { db, turno } = await turnoPorToken(token);
  if (!turno) redirect("/");
  if (aprobado) {
    const r = await db.query(
      "UPDATE turno SET estado = 'CONFIRMADO', expira_en = NULL WHERE token = $1 AND estado = 'PENDIENTE_PAGO' AND expira_en > now() RETURNING id",
      [token],
    );
    redirect(r.rows.length ? `/reservar/confirmado/${token}` : `/reservar/pago/${token}`);
  }
  await db.query("UPDATE turno SET estado = 'CANCELADO' WHERE token = $1 AND estado = 'PENDIENTE_PAGO'", [token]);
  redirect(`/reservar/${turno.profesional_id}?prestacion=${turno.prestacion_id}&consultorio=${turno.consultorio_id}&error=pago`);
}

export default async function Pago({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { turno: t } = await turnoPorToken(token);
  if (!t) notFound();
  if (t.estado === "CONFIRMADO") redirect(`/reservar/confirmado/${token}`);
  const vigente = t.estado === "PENDIENTE_PAGO" && t.expira_en && t.expira_en.getTime() > Date.now();
  const total = Number(t.precio_centavos) + Number(t.cargo_centavos);
  const volver = `/reservar/${t.profesional_id}?prestacion=${t.prestacion_id}&consultorio=${t.consultorio_id}`;

  return (
    <>
      <section className="hero">
        <h1>{vigente ? "Pagá para confirmar tu turno" : "La reserva se venció"}</h1>
        <p className="muted">
          {vigente
            ? "El horario está reservado para vos mientras corre el tiempo."
            : "Pasaron 15 minutos sin pagar y el horario se liberó. Si sigue libre, podés volver a elegirlo."}
        </p>
      </section>

      <div className="reserva">
        <div className="reserva-pasos">
          {vigente ? (
            <section className="paso pago">
              <div className="pago-reloj">
                <span className="paso-label">Tiempo para pagar</span>
                <CuentaRegresiva hasta={t.expira_en!.toISOString()} />
              </div>
              <div className="pago-simulado">
                <p className="paso-label">Pago simulado · prototipo</p>
                <p className="small muted">En producción acá se abre el checkout de Mercado Pago y el turno se confirma cuando llega su aviso de pago aprobado.</p>
                <form action={simularPago} className="pago-acciones">
                  <input type="hidden" name="token" value={token} />
                  <button type="submit" name="resultado" value="aprobado" className="btn">Simular pago aprobado · {money(total)}</button>
                  <button type="submit" name="resultado" value="rechazado" className="btn-texto">Simular pago rechazado</button>
                </form>
              </div>
            </section>
          ) : (
            <section className="paso">
              <Link href={volver} className="btn">Elegir otro horario</Link>
            </section>
          )}
        </div>
        <aside className="reserva-resumen">
          <ResumenTurno
            profesional={t.profesional} especialidad={t.especialidad}
            prestacion={t.prestacion} duracionMin={t.duracion_min}
            consultorio={t.consultorio} barrio={t.barrio} inicio={t.inicio}
            montoCentavos={Number(t.precio_centavos)} cargoCentavos={Number(t.cargo_centavos)}
            politica={t.politica_cancelacion}
          />
        </aside>
      </div>
    </>
  );
}
