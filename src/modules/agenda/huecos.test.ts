import { describe, expect, it } from "vitest";
import { calcularGrilla, calcularHuecos, diaAR, lunesDe } from "./huecos";

// Lunes 16/11/2026, 08:00 en Buenos Aires.
const LUNES_8 = new Date("2026-11-16T08:00:00-03:00");
const lunes = { consultorioId: 1, diaSemana: 1, desde: "09:00", hasta: "11:00" };
const hora = (d: Date) => d.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

describe("calcularHuecos", () => {
  it("parte la franja en turnos de la duración de la prestación", () => {
    const h = calcularHuecos({ reglas: [lunes], ocupados: [], duracionMin: 30, ahora: LUNES_8, dias: 1 });
    expect(h.map((x) => hora(x.inicio))).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("no ofrece un turno que no entra completo antes del cierre", () => {
    const h = calcularHuecos({ reglas: [lunes], ocupados: [], duracionMin: 45, ahora: LUNES_8, dias: 1 });
    expect(h.map((x) => hora(x.inicio))).toEqual(["09:00", "09:45"]);
  });

  it("saltea los huecos que se pisan con turnos ocupados", () => {
    const ocupados = [{ inicio: new Date("2026-11-16T09:15:00-03:00"), fin: new Date("2026-11-16T09:45:00-03:00") }];
    const h = calcularHuecos({ reglas: [lunes], ocupados, duracionMin: 30, ahora: LUNES_8, dias: 1 });
    expect(h.map((x) => hora(x.inicio))).toEqual(["10:00", "10:30"]);
  });

  it("respeta la anticipación mínima", () => {
    const ahora = new Date("2026-11-16T09:10:00-03:00");
    const h = calcularHuecos({ reglas: [lunes], ocupados: [], duracionMin: 30, ahora, dias: 1, anticipacionMin: 60 });
    expect(h.map((x) => hora(x.inicio))).toEqual(["10:30"]);
  });

  it("usa la fecha de Argentina aunque en UTC ya sea el día siguiente", () => {
    // Domingo 15/11 22:30 en BA = lunes 16/11 01:30 UTC.
    const ahora = new Date("2026-11-15T22:30:00-03:00");
    expect(diaAR(ahora)).toBe("2026-11-15");
    const h = calcularHuecos({ reglas: [lunes], ocupados: [], duracionMin: 60, ahora, dias: 2 });
    expect(h.map((x) => diaAR(x.inicio))).toEqual(["2026-11-16", "2026-11-16"]);
  });

  it("devuelve todo ordenado aunque haya varios consultorios", () => {
    const otro = { consultorioId: 2, diaSemana: 1, desde: "08:30", hasta: "09:30" };
    const h = calcularHuecos({ reglas: [lunes, otro], ocupados: [], duracionMin: 60, ahora: new Date("2026-11-16T07:00:00-03:00"), dias: 1 });
    expect(h.map((x) => [x.consultorioId, hora(x.inicio)])).toEqual([[2, "08:30"], [1, "09:00"], [1, "10:00"]]);
  });
});

describe("calcularGrilla", () => {
  it("devuelve todas las casillas, con las ocupadas y las pasadas bloqueadas", () => {
    const ahora = new Date("2026-11-16T08:40:00-03:00"); // con 60' de anticipación, 09:00 y 09:30 ya no llegan
    const ocupados = [{ inicio: new Date("2026-11-16T10:00:00-03:00"), fin: new Date("2026-11-16T10:30:00-03:00") }];
    const g = calcularGrilla({ reglas: [lunes], ocupados, duracionMin: 30, ahora, dias: 1 });
    expect(g.map((c) => [hora(c.inicio), c.estado])).toEqual([
      ["09:00", "pasado"], ["09:30", "pasado"], ["10:00", "ocupado"], ["10:30", "libre"],
    ]);
  });

  it("arranca desde el día pedido", () => {
    const g = calcularGrilla({ reglas: [lunes], ocupados: [], duracionMin: 60, ahora: LUNES_8, desde: "2026-11-23", dias: 7 });
    expect(new Set(g.map((c) => diaAR(c.inicio)))).toEqual(new Set(["2026-11-23"]));
  });
});

describe("lunesDe", () => {
  it("lleva cualquier día al lunes de su semana", () => {
    expect(lunesDe("2026-11-16")).toBe("2026-11-16");
    expect(lunesDe("2026-11-19")).toBe("2026-11-16");
    expect(lunesDe("2026-11-22")).toBe("2026-11-16"); // domingo
  });
});
