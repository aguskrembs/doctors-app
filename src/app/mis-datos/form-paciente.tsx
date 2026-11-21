"use client";

import { useActionState, useState } from "react";
import type { DatosPaciente } from "@/modules/pacientes";
import { guardarMisDatos, type EstadoForm } from "./acciones";

type Props = { inicial: DatosPaciente; financiadores: string[] };
type Errores = EstadoForm["errores"];

// Fuera del formulario a propósito: si se definiera adentro, se volvería a montar en cada
// render y se perdería lo que el usuario tipeó (los inputs no son controlados).
function Campo({ nombre, label, tipo = "text", ayuda, v, e, ...rest }: {
  nombre: keyof DatosPaciente; label: string; tipo?: string; ayuda?: string; v: DatosPaciente; e: Errores;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      {label}
      <input name={nombre} type={tipo} defaultValue={v[nombre] ?? ""} aria-invalid={!!e[nombre]}
        aria-describedby={e[nombre] ? `err-${nombre}` : undefined} {...rest} />
      {e[nombre] ? <span className="campo-error" id={`err-${nombre}`}>{e[nombre]}</span> : ayuda && <span className="small muted">{ayuda}</span>}
    </label>
  );
}

export function FormPaciente({ inicial, financiadores }: Props) {
  const [estado, accion, guardando] = useActionState<EstadoForm, FormData>(guardarMisDatos, { ok: false, errores: {} });
  const v = estado.valores ?? inicial;
  const e = estado.errores;
  const [financiador, setFinanciador] = useState(inicial.coberturaFinanciador ?? "");

  return (
    <form action={accion} className="form mis-datos-form" noValidate>
      <fieldset className="grupo-datos">
        <legend>Datos personales</legend>
        <Campo v={v} e={e} nombre="nombre" label="Nombre y apellido" autoComplete="name" />
        <div className="fila-2">
          <Campo v={v} e={e} nombre="dni" label="DNI" inputMode="numeric" autoComplete="off" ayuda="Lo guardamos cifrado." />
          <Campo v={v} e={e} nombre="telefono" label="Celular (WhatsApp)" tipo="tel" autoComplete="tel" ayuda="Te avisamos de tus turnos por acá." />
        </div>
        <Campo v={v} e={e} nombre="email" label="Email (opcional)" tipo="email" autoComplete="email" />
      </fieldset>

      <fieldset className="grupo-datos">
        <legend>Cobertura</legend>
        <label>Prepaga u obra social
          <select name="coberturaFinanciador" value={financiador} onChange={(ev) => setFinanciador(ev.target.value)}>
            <option value="">No tengo, me atiendo particular</option>
            {financiadores.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        {financiador && (
          <div className="fila-2">
            <Campo v={v} e={e} nombre="coberturaPlan" label="Plan" />
            <Campo v={v} e={e} nombre="nroAfiliado" label="Número de afiliado" autoComplete="off" />
          </div>
        )}
      </fieldset>

      <div className="form-pie">
        <button type="submit" className="btn" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
        {estado.ok && !guardando && <span className="guardado" role="status">Datos guardados</span>}
      </div>
    </form>
  );
}
