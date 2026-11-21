// Cálculo de huecos libres: función pura, sin base de datos (ver huecos.test.ts).
// Argentina no tiene horario de verano desde 2009, así que el offset es fijo.
const OFFSET = "-03:00";
const fechaAR = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
});

export type Regla = { consultorioId: number; diaSemana: number; desde: string; hasta: string }; // "09:00" o "09:00:00"
export type Ocupado = { inicio: Date; fin: Date };
export type Hueco = { consultorioId: number; inicio: Date; fin: Date };
/** libre: se puede reservar · ocupado: lo pisa otro turno · pasado: ya no llega a la anticipación mínima. */
export type EstadoCasilla = "libre" | "ocupado" | "pasado";
export type Casilla = Hueco & { estado: EstadoCasilla };

/** Fecha calendario en Argentina: "2026-11-17". */
export const diaAR = (d: Date) => fechaAR.format(d);

export function sumarDias(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaAR(d);
}

/** Lunes de la semana de esa fecha (las semanas del calendario van de lunes a domingo). */
export function lunesDe(ymd: string) {
  const dow = new Date(`${ymd}T12:00:00${OFFSET}`).getUTCDay();
  return sumarDias(ymd, dow === 0 ? -6 : 1 - dow);
}

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const aHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

type Entrada = {
  reglas: Regla[];
  ocupados: Ocupado[];
  duracionMin: number;
  ahora: Date;
  /** Primer día a mirar ("2026-11-16"); por defecto, hoy. */
  desde?: string;
  /** Días calendario a mirar, contando el primero. */
  dias?: number;
  /** No se ofrecen turnos que empiecen antes de ahora + anticipación. */
  anticipacionMin?: number;
};

/**
 * Grilla completa: todas las casillas de `duracionMin` dentro de las franjas semanales,
 * cada una con su estado. Los ocupados son del profesional en cualquier consultorio:
 * no puede estar en dos lugares.
 */
export function calcularGrilla({ reglas, ocupados, duracionMin, ahora, desde, dias = 14, anticipacionMin = 60 }: Entrada): Casilla[] {
  const casillas: Casilla[] = [];
  const primero = desde ?? diaAR(ahora);
  const minimo = ahora.getTime() + anticipacionMin * 60_000;

  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(primero, i);
    const diaSemana = new Date(`${fecha}T12:00:00${OFFSET}`).getUTCDay();
    for (const r of reglas) {
      if (r.diaSemana !== diaSemana) continue;
      for (let t = aMin(r.desde); t + duracionMin <= aMin(r.hasta); t += duracionMin) {
        const inicio = new Date(`${fecha}T${aHHMM(t)}:00${OFFSET}`);
        const fin = new Date(inicio.getTime() + duracionMin * 60_000);
        const estado: EstadoCasilla =
          inicio.getTime() < minimo ? "pasado"
          : ocupados.some((o) => o.inicio < fin && inicio < o.fin) ? "ocupado"
          : "libre";
        casillas.push({ consultorioId: r.consultorioId, inicio, fin, estado });
      }
    }
  }
  return casillas.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Solo los huecos que se pueden reservar. */
export function calcularHuecos(e: Entrada): Hueco[] {
  return calcularGrilla(e)
    .filter((c) => c.estado === "libre")
    .map(({ consultorioId, inicio, fin }) => ({ consultorioId, inicio, fin }));
}
