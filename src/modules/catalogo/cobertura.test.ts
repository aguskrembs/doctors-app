import { describe, expect, it } from "vitest";
import { coberturaPara } from "./cobertura";

const quiroga = [
  { financiador: "Prepaga A", modalidad: "CONVENIO", plusCentavos: 1500000 },
  { financiador: "Prepaga B", modalidad: "REINTEGRO", plusCentavos: null },
];

describe("coberturaPara", () => {
  it("sin cobertura es particular", () => {
    expect(coberturaPara(null, quiroga)).toEqual({ caso: "particular" });
  });
  it("convenio informa el plus", () => {
    expect(coberturaPara("Prepaga A", quiroga)).toEqual({ caso: "convenio", financiador: "Prepaga A", plusCentavos: 1500000 });
  });
  it("reintegro cuando da factura", () => {
    expect(coberturaPara("Prepaga B", quiroga)).toEqual({ caso: "reintegro", financiador: "Prepaga B" });
  });
  it("no trabaja con una cobertura que no aparece", () => {
    expect(coberturaPara("Obra social C", quiroga)).toEqual({ caso: "no_trabaja", financiador: "Obra social C" });
  });
  it("compara sin importar mayúsculas ni espacios", () => {
    expect(coberturaPara("  prepaga a ", quiroga).caso).toBe("convenio");
  });
  it("convenio sin plus cargado cuenta como plus cero", () => {
    expect(coberturaPara("X", [{ financiador: "X", modalidad: "CONVENIO", plusCentavos: null }])).toEqual({ caso: "convenio", financiador: "X", plusCentavos: 0 });
  });
});
