import { cookies } from "next/headers";

// Sesión de DEMO: reemplaza la autenticación hasta tener Better Auth.
// Se elige desde el selector "Ver como" del header y vive en una cookie.
// Sin cookie (o con un valor inválido) se navega como visitante.
export type Sesion =
  | { rol: "visitante" }
  | { rol: "paciente"; pacienteId: number }
  | { rol: "profesional"; profesionalId: number };

export const COOKIE_SESION = "sesion_demo";

export function parseSesion(valor: string | undefined): Sesion {
  const prof = /^prof:(\d+)$/.exec(valor ?? "");
  if (prof) return { rol: "profesional", profesionalId: Number(prof[1]) };
  const pac = /^pac:(\d+)$/.exec(valor ?? "");
  if (pac) return { rol: "paciente", pacienteId: Number(pac[1]) };
  return { rol: "visitante" };
}

export const valorSesion = (s: Sesion) =>
  s.rol === "profesional" ? `prof:${s.profesionalId}` : s.rol === "paciente" ? `pac:${s.pacienteId}` : "visitante";

export async function getSesion(): Promise<Sesion> {
  return parseSesion((await cookies()).get(COOKIE_SESION)?.value);
}

/** Pantalla de inicio de cada rol (adonde lleva el logo). */
export const inicio = (s: Sesion) => (s.rol === "profesional" ? "/panel/agenda" : "/");
