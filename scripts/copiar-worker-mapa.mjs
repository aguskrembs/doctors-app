// MapLibre 6 levanta su web worker con `new URL(..., import.meta.url)`, y Turbopack
// no lo sirve. Copiamos el worker a public/ (misma versión que la instalada) y el
// componente del mapa lo apunta con setWorkerUrl. Corre en `npm install` (postinstall).
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs");
