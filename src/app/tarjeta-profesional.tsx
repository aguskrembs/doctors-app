import Link from "next/link";
import type { ReactNode } from "react";
import { CARGO_SERVICIO, cifra, hace, money, turnoTexto } from "@/lib";
// Import directo (no el index del módulo): esta tarjeta también corre en el cliente.
import { coberturaPara, type CoberturaProfesional } from "@/modules/catalogo/cobertura";

// Datos ya serializables: los usa la vista lista (server) y la hoja del mapa (client).
export type ProfesionalVM = {
  id: number;
  nombre: string;
  especialidad: string;
  verificado: boolean;
  prestaciones: { nombre: string; duracionMin: number; montoCentavos: number; dias: number }[];
  consultorios: { id: number; nombre: string; barrio: string; dias: string; lat: number; lng: number }[];
  coberturas: { financiador: string; modalidad: string; plusCentavos: number | null }[];
  /** Primer hueco libre en los próximos 14 días (ISO), o null. */
  proximoTurno: string | null;
};

type Props = {
  p: ProfesionalVM;
  /** Acción arriba a la derecha (cerrar, y más adelante "Pedir turno"). */
  accion?: ReactNode;
  /** Línea extra debajo del encabezado (por ejemplo, la distancia en el mapa). */
  extra?: ReactNode;
  /** Si viene, la tarjeta muestra el pie con el próximo turno y el botón de reserva. */
  reservarHref?: string;
  /**
   * Cobertura del paciente con sesión (null = particular). Si viene, la tarjeta dice
   * qué pasa con SU cobertura; undefined (visitante) no muestra la franja.
   */
  coberturaPaciente?: string | null;
  className?: string;
};

/** Franja "Con tu Prepaga A: …". También la usa el resumen de la reserva. */
export function FranjaCobertura({ financiador, coberturas }: { financiador: string | null; coberturas: CoberturaProfesional[] }) {
  const r = coberturaPara(financiador, coberturas);
  if (r.caso === "particular") return null;
  const texto =
    r.caso === "convenio" ? <>Con tu <strong>{r.financiador}</strong>: convenio. En el consultorio pagás un plus de <span className="mono">{money(r.plusCentavos)}</span>.</>
    : r.caso === "reintegro" ? <>Con tu <strong>{r.financiador}</strong>: te da factura para pedir reintegro.</>
    : <>No trabaja con <strong>{r.financiador}</strong>: la atención es particular.</>;
  return <p className={`franja-cobertura ${r.caso}`}>{texto}</p>;
}

export function TarjetaProfesional({ p, accion, extra, reservarHref, coberturaPaciente, className = "" }: Props) {
  return (
    <article className={`card ${className}`}>
      <header>
        <div>
          <h2>{p.nombre}</h2>
          <div className="esp">
            <span className="muted">{p.especialidad}</span>
            {p.verificado ? <span className="badge ok">Matrícula verificada</span> : <span className="badge">En verificación</span>}
          </div>
        </div>
        {accion}
      </header>

      {extra}
      {coberturaPaciente !== undefined && <FranjaCobertura financiador={coberturaPaciente} coberturas={p.coberturas} />}

      <ul className="prest">
        {p.prestaciones.map((x) => {
          const cargo = Math.round(x.montoCentavos * CARGO_SERVICIO);
          return (
            <li key={x.nombre}>
              <div className="recibo mono">
                <div className="linea"><span>{x.nombre} · {x.duracionMin}&apos;</span><span>{cifra(x.montoCentavos)}</span></div>
                <div className="linea sec"><span>Cargo de servicio</span><span>{cifra(cargo)}</span></div>
                <div className="linea total"><span>Total</span><span>{money(x.montoCentavos + cargo)}</span></div>
              </div>
              <div className={x.dias > 30 ? "fresh stale" : "fresh"}>Precio actualizado {hace(x.dias)}</div>
            </li>
          );
        })}
      </ul>

      <div className="meta">
        {p.consultorios.map((c) => (
          <div key={c.id}><span className="muted">📍</span> {c.barrio} · {c.dias}</div>
        ))}
        {p.coberturas.map((c) => (
          <div key={c.financiador} className="small">
            <span className="muted">Cobertura:</span> {c.financiador} ·{" "}
            {c.modalidad === "CONVENIO" ? `convenio, plus ${money(c.plusCentavos ?? 0)}` : "factura para reintegro"}
          </div>
        ))}
      </div>

      {reservarHref && (
        <footer className="card-pie">
          <div className="proximo">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="16" rx="2" /><path d="M16 3v4M8 3v4M4 11h16" />
            </svg>
            <div>
              <span className="proximo-label">Próximo turno disponible</span>
              <span className="proximo-fecha mono">{p.proximoTurno ? turnoTexto(p.proximoTurno) : "Sin turnos en 14 días"}</span>
            </div>
          </div>
          <Link href={reservarHref} className="btn">Reservar turno</Link>
        </footer>
      )}
    </article>
  );
}
