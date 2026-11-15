import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { SCHEMA } from "./schema";
import { SEED } from "./seed";

// Base Postgres real (WASM) que corre dentro del servidor de Next y se guarda
// en .data/. Para resetear: borrar la carpeta .data y reiniciar.
const g = globalThis as unknown as { __db?: Promise<PGlite> };

async function init() {
  mkdirSync("./.data", { recursive: true });
  const db = new PGlite("./.data/pglite", { extensions: { btree_gist } });
  const { rows } = await db.query<{ existe: boolean }>(
    "SELECT to_regclass('public.profesional') IS NOT NULL AS existe",
  );
  if (!rows[0].existe) {
    await db.exec(SCHEMA);
    await db.exec(SEED);
  }
  return db;
}

export function getDb() {
  // Si la inicialización falla, no se cachea el error: el próximo request reintenta.
  return (g.__db ??= init().catch((e) => {
    g.__db = undefined;
    throw e;
  }));
}
