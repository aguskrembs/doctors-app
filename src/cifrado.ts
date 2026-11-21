import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Cifrado a nivel columna para datos personales sensibles (DNI), como pide docs/02.
// AES-256-GCM: cada valor lleva su IV y su tag de autenticación.
// La clave viene de DATOS_CLAVE; en desarrollo hay una fija para no trabar la demo.
const secreto = process.env.DATOS_CLAVE ?? (process.env.NODE_ENV === "production" ? undefined : "solo-desarrollo-no-usar-en-produccion");
if (!secreto) throw new Error("Falta DATOS_CLAVE para cifrar datos personales");
const clave = createHash("sha256").update(secreto).digest();

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave, iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64");
}

export function descifrar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const b = Buffer.from(valor, "base64");
  const d = createDecipheriv("aes-256-gcm", clave, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

/** "30.111.222" → "••.•••.222": para mostrar sin exponer el DNI completo. */
export const dniOculto = (dni: string | null) => (dni ? `••.•••.${dni.replace(/\D/g, "").slice(-3)}` : null);
