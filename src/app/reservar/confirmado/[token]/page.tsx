import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fechaLarga } from "@/lib";
import { ResumenTurno } from "../../resumen-turno";
import { turnoPorToken } from "../../turno";

export const dynamic = "force-dynamic";

export default async function Confirmado({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { turno: t } = await turnoPorToken(token);
  if (!t) notFound();
  if (t.estado !== "CONFIRMADO") redirect(`/reservar/pago/${token}`);

  return (
    <>
      <section className="hero confirmado">
        <span className="sello" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
        </span>
        <h1>Tu turno quedó confirmado</h1>
        <p className="muted">
          {t.paciente.split(" ")[0]}, te esperamos el <span className="mono">{fechaLarga(t.inicio)}</span> en {t.consultorio}, {t.barrio}.
        </p>
      </section>

      <div className="reserva">
        <div className="reserva-pasos">
          <section className="paso">
            <h2>Qué sigue</h2>
            <ul className="siguientes">
              <li>Te vamos a avisar por WhatsApp 48 y 24 horas antes, con un link para confirmar, cambiar o cancelar.</li>
              <li>Si necesitás factura para pedir reintegro a tu prepaga, la emite el profesional.</li>
            </ul>
            <p className="small muted">En el prototipo todavía no se envían avisos.</p>
            <Link href="/" className="btn">Volver al buscador</Link>
          </section>
        </div>
        <aside className="reserva-resumen">
          <ResumenTurno
            profesional={t.profesional} especialidad={t.especialidad}
            prestacion={t.prestacion} duracionMin={t.duracion_min}
            consultorio={t.consultorio} barrio={t.barrio} inicio={t.inicio}
            montoCentavos={Number(t.precio_centavos)} cargoCentavos={Number(t.cargo_centavos)}
            politica={t.politica_cancelacion} pagado
          />
        </aside>
      </div>
    </>
  );
}
