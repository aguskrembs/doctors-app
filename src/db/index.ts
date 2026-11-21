import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { MIGRACIONES, SCHEMA } from "./schema";
import { SEED } from "./seed";
import { cifrar } from "@/cifrado";

// Base Postgres real (WASM) que corre dentro del servidor de Next y se guarda
// en .data/. Para resetear: borrar la carpeta .data y reiniciar.
// La conexión vive en globalThis para sobrevivir al hot reload. Las migraciones se
// cachean aparte, por texto: si MIGRACIONES cambia, se vuelven a correr sin reiniciar.
const g = globalThis as unknown as { __db?: Promise<PGlite>; __migrado?: { sql: string; listo: Promise<PGlite> } };

async function abrir() {
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
  // Si algo falla, no se cachea el error: el próximo request reintenta.
  g.__db ??= abrir().catch((e) => {
    g.__db = undefined;
    throw e;
  });
  if (g.__migrado?.sql !== MIGRACIONES) {
    const listo = g.__db.then(async (db) => {
      await db.exec(MIGRACIONES);
      await cargarDniDemo(db);
      return db;
    });
    listo.catch(() => { g.__migrado = undefined; });
    g.__migrado = { sql: MIGRACIONES, listo };
  }
  return g.__migrado!.listo;
}

/** DNI de los usuarios de demo: se cifra en la app, así que no puede ir en el SQL de MIGRACIONES. */
async function cargarDniDemo(db: PGlite) {
  const dnis: Record<number, string> = { 1: "30111222", 2: "28456789", 3: "35987654" };
  const { rows } = await db.query<{ id: number }>("SELECT id FROM paciente WHERE usuario_demo AND dni_cifrado IS NULL");
  for (const { id } of rows) {
    if (dnis[id]) await db.query("UPDATE paciente SET dni_cifrado = $1 WHERE id = $2", [cifrar(dnis[id]), id]);
  }
}
