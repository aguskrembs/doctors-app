import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turnos médicos transparentes",
  description: "Encontrá un profesional, mirá el precio vigente y reservá.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="top">
          <div className="wrap bar">
            <Link href="/" className="brand">Turnos<span>.</span></Link>
            <nav>
              <Link href="/">Buscar</Link>
              <Link href="/agenda">Agenda del profesional</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
