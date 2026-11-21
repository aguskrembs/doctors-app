import { redirect } from "next/navigation";
import { getSesion, inicio } from "@/sesion";

// La reserva es del paciente. El visitante solo llega a /reservar/[id], que le muestra el
// próximo turno y le pide cuenta; pago y confirmación validan además que el turno sea suyo.
export default async function ReservarLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (sesion.rol === "profesional") redirect(inicio(sesion));
  return children;
}
