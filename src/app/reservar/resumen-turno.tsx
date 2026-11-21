import Link from "next/link";
import type { ReactNode } from "react";
import { cifra, fechaLarga, money } from "@/lib";
import { textoPolitica } from "@/modules/agenda";

type Props = {
  profesional: string;
  especialidad: string;
  prestacion: string;
  duracionMin: number;
  consultorio: string;
  barrio: string;
  inicio: Date | null;
  montoCentavos: number;
  cargoCentavos: number;
  politica: string;
  pagado?: boolean;
  titulo?: string;
  /** Paciente con sesión: se muestra en el resumen (ya no se piden "Tus datos"). */
  paciente?: { nombre: string; telefono: string | null };
  /** Franja de cobertura del paciente con este profesional. */
  cobertura?: ReactNode;
  children?: ReactNode;
};

/** Resumen del turno con el precio en formato comprobante. Se usa en reserva, pago y confirmación. */
export function ResumenTurno(p: Props) {
  return (
    <section className="card resumen">
      <h2>{p.titulo ?? "Tu turno"}</h2>
      <dl className="resumen-datos">
        <div><dt>Profesional</dt><dd>{p.profesional} · {p.especialidad}</dd></div>
        <div><dt>Prestación</dt><dd>{p.prestacion} · {p.duracionMin} min</dd></div>
        <div><dt>Dónde</dt><dd>{p.consultorio} · {p.barrio}</dd></div>
        {p.paciente && (
          <div>
            <dt>Paciente</dt>
            <dd>{p.paciente.nombre}{p.paciente.telefono && <> · <span className="mono">{p.paciente.telefono}</span></>}{" "}
              <Link href="/mis-datos" className="link-sutil">Editar en Mis datos</Link></dd>
          </div>
        )}
        <div><dt>Cuándo</dt><dd className={p.inicio ? "mono" : "muted"}>{p.inicio ? fechaLarga(p.inicio) : "Elegí un horario"}</dd></div>
      </dl>
      {p.cobertura}

      <div className="recibo mono">
        <div className="linea"><span>{p.prestacion}</span><span>{cifra(p.montoCentavos)}</span></div>
        <div className="linea sec"><span>Cargo de servicio</span><span>{cifra(p.cargoCentavos)}</span></div>
        <div className="linea total"><span>{p.pagado ? "Total pagado" : "Total"}</span><span>{money(p.montoCentavos + p.cargoCentavos)}</span></div>
        <div className="linea sec chica"><span>Al profesional</span><span>{cifra(p.montoCentavos)}</span></div>
      </div>

      <p className="muted small">{textoPolitica(p.politica, p.inicio)}</p>
      {p.children}
    </section>
  );
}
