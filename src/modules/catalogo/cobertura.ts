// Qué pasa con la cobertura de un paciente con un profesional puntual. Función pura (ver cobertura.test.ts).
export type CoberturaProfesional = { financiador: string; modalidad: string; plusCentavos: number | null };

export type ResultadoCobertura =
  | { caso: "particular" }                                          // el paciente no tiene cobertura
  | { caso: "convenio"; financiador: string; plusCentavos: number }  // atiende por convenio, cobra plus
  | { caso: "reintegro"; financiador: string }                      // cobra particular y da factura
  | { caso: "no_trabaja"; financiador: string };                    // no trabaja con esa cobertura

export function coberturaPara(financiadorPaciente: string | null, delProfesional: CoberturaProfesional[]): ResultadoCobertura {
  if (!financiadorPaciente) return { caso: "particular" };
  const norm = (s: string) => s.trim().toLocaleLowerCase("es-AR");
  const c = delProfesional.find((x) => norm(x.financiador) === norm(financiadorPaciente));
  if (!c) return { caso: "no_trabaja", financiador: financiadorPaciente };
  if (c.modalidad === "CONVENIO") return { caso: "convenio", financiador: c.financiador, plusCentavos: c.plusCentavos ?? 0 };
  return { caso: "reintegro", financiador: c.financiador };
}
