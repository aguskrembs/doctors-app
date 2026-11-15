/** @type {import('next').NextConfig} */
export default {
  // PGlite carga WASM propio: que Next no lo empaquete.
  serverExternalPackages: ["@electric-sql/pglite"],
};
