import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader, Schibsted_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { getDb } from "@/db";
import { getSesion, inicio, valorSesion } from "@/sesion";
import { SelectorRol } from "./selector-rol";
import "./globals.css";

// Tipografía del sistema (ver CLAUDE.md → Diseño frontend).
const display = Newsreader({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-display" });
const ui = Schibsted_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ui" });
const num = Spline_Sans_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-num" });

export const metadata: Metadata = {
  title: "Turnos médicos transparentes",
  description: "Encontrá un profesional, mirá el precio vigente y reservá.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  const db = await getDb();
  const [profesionales, pacientes] = await Promise.all([
    db.query<{ id: number; nombre: string }>("SELECT id, nombre FROM profesional ORDER BY id"),
    db.query<{ id: number; nombre: string; cobertura: string | null }>(
      "SELECT id, nombre, cobertura_financiador AS cobertura FROM paciente WHERE usuario_demo ORDER BY id"),
  ]);

  return (
    <html lang="es" className={`${display.variable} ${ui.variable} ${num.variable}`}>
      <body>
        <header className="top">
          <div className="wrap bar">
            <Link href={inicio(sesion)} className="brand">Turnos<span>.</span></Link>
            <nav>
              {sesion.rol === "visitante" && (
                <>
                  <Link href="/#buscar" className="solo-ancho">Buscar</Link>
                  <Link href="/#profesionales" className="solo-ancho">Para profesionales</Link>
                </>
              )}
              {sesion.rol === "paciente" && <Link href="/">Buscar</Link>}
              {sesion.rol === "profesional" && <Link href="/panel/agenda">Agenda</Link>}
              {sesion.rol !== "visitante" && <Link href="/mis-datos">Mis datos</Link>}
              <SelectorRol actual={valorSesion(sesion)} pacientes={pacientes.rows} profesionales={profesionales.rows} />
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
