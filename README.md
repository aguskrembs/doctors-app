# Turnos médicos

Base del proyecto (ver `docs/`). Next.js + base Postgres local (PGlite) con datos de ejemplo.

```bash
npm install
npm run dev     # http://localhost:3000
```

- La base se crea sola en `.data/` la primera vez. Para volver a los datos de ejemplo, borrá `.data/` y reiniciá.
- Esquema en `src/db/schema.ts`, datos en `src/db/seed.ts`.
