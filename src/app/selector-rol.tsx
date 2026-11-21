"use client";

import { useTransition } from "react";
import { cambiarSesion } from "./acciones";

type Props = {
  actual: string;
  pacientes: { id: number; nombre: string; cobertura: string | null }[];
  profesionales: { id: number; nombre: string }[];
};

/** Selector de demo para cambiar de usuario. Se va cuando haya login real. */
export function SelectorRol({ actual, pacientes, profesionales }: Props) {
  const [pendiente, start] = useTransition();
  return (
    <label className="selector-rol">
      <span>Ver como</span>
      <select
        value={actual}
        disabled={pendiente}
        onChange={(e) => {
          const v = e.target.value;
          start(() => cambiarSesion(v));
        }}
      >
        <option value="visitante">Visitante (sin registrar)</option>
        <optgroup label="Pacientes">
          {pacientes.map((p) => (
            <option key={p.id} value={`pac:${p.id}`}>{p.nombre} · {p.cobertura ?? "Particular"}</option>
          ))}
        </optgroup>
        <optgroup label="Profesionales">
          {profesionales.map((p) => (
            <option key={p.id} value={`prof:${p.id}`}>{p.nombre}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
