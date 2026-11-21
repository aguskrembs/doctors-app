"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, inicio, parseSesion, valorSesion } from "@/sesion";

/** Cambia el usuario de demo y lleva al inicio de su rol. */
export async function cambiarSesion(valor: string) {
  const sesion = parseSesion(valor); // cualquier valor inválido cae en "visitante"
  (await cookies()).set(COOKIE_SESION, valorSesion(sesion), { path: "/", sameSite: "lax", httpOnly: true });
  redirect(inicio(sesion));
}
