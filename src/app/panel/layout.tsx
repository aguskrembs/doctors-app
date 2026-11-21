import { redirect } from "next/navigation";
import { getSesion } from "@/sesion";

// Todo /panel/* es solo para profesionales (y, más adelante, secretarias).
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (sesion.rol !== "profesional") redirect("/");
  return children;
}
