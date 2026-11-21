# Estructura del proyecto

> Actualizado: 2026-11-21. Refleja el repo a esa fecha; si cambia la organización, se actualiza en el mismo cambio.

## El repo de un vistazo

```
doctors-app/
├── CLAUDE.md          Reglas para desarrollar (código, diseño visual, copy)
├── README.md          Cómo correr el proyecto
├── workspace/         Producto: lineamientos, estructura, exploraciones, decisiones
├── docs/              Especificación vigente del producto
├── src/               Código de la app (Next.js)
├── scripts/           Tareas auxiliares (p. ej. copiar el worker del mapa)
├── public/            Archivos estáticos
└── .claude/           Configuración del preview local (launch.json)
```

## Documentación: qué va en cada lugar

| Lugar | Contenido | Quién lo escribe | Cuánto cambia |
|---|---|---|---|
| `workspace/lineamientos.md` | Principios: el porqué de todo | Producto | Poco, y con decisión registrada |
| `workspace/backend-y-datos.md` | Diseño propuesto del backend y la base, y distancia con el prototipo | Producto | Con cada decisión de arquitectura o de modelo |
| `workspace/exploraciones/` | Ideas abiertas, opciones, preguntas | Producto | Mucho; es borrador |
| `workspace/decisiones/` | Qué se decidió, por qué, qué se descartó | Producto | Se agrega; no se reescribe |
| `docs/` | Cómo es el producto hoy: el "qué" detallado | Producto y código | Con cada decisión |
| `docs/superpowers/specs/` | Diseños de funcionalidades puntuales, escritos al implementarlas | Código | Una por funcionalidad |
| `CLAUDE.md` | Cómo se escribe el código y la interfaz | Código | Con cada convención nueva |

### Los documentos de `docs/`

| Doc | Para qué |
|---|---|
| [01-producto.md](../docs/01-producto.md) | Tesis, usuarios, piloto, métricas, fases, políticas de cancelación |
| [02-arquitectura.md](../docs/02-arquitectura.md) | Stack, módulos, flujos críticos, seguridad, ADR 001–008 |
| [03-modelo-de-datos.md](../docs/03-modelo-de-datos.md) | Esquema y máquina de estados del turno |
| [04-legal-y-riesgos.md](../docs/04-legal-y-riesgos.md) | Regulación, datos sensibles, riesgos de producto |
| [05-flujos-y-pantallas.md](../docs/05-flujos-y-pantallas.md) | Rutas, quién ve qué, flujos de UI, estados visuales, decisiones abiertas D1–D6, orden de construcción |
| [one-pager.html](../docs/one-pager.html) | Resumen del proyecto para compartir |

## Código

Monolito modular en Next.js (App Router) con TypeScript. En desarrollo, la base es PGlite (Postgres en el mismo proceso, guardado en `.data/`).

```
src/
├── app/               Rutas y pantallas
│   ├── page.tsx         /            landing (visitante) o buscador (paciente)
│   ├── reservar/        /reservar/*  reserva, pago simulado y confirmación
│   ├── mis-datos/       /mis-datos   datos del paciente o ficha del profesional
│   └── panel/           /panel/*     agenda del profesional y la secretaria
├── modules/           Lógica de dominio, un módulo por área
│   ├── agenda/          huecos, turnos y su máquina de estados
│   ├── catalogo/        prestaciones, precios y coberturas
│   └── pacientes/       datos del paciente
├── db/                Esquema, migraciones y datos de ejemplo
├── sesion.ts          Sesión de demo ("Ver como") hasta tener login real
├── cifrado.ts         Cifrado de datos sensibles (DNI)
└── lib.ts             Utilidades comunes (plata, fechas)
```

Reglas de la estructura:
- Cada módulo expone su API en `modules/<x>/index.ts` y no lee tablas de otro módulo.
- Los módulos previstos que todavía no existen (identidad, profesionales, consultorios, pagos, notificaciones, búsqueda), con las tablas de cada uno, están en [backend-y-datos.md](backend-y-datos.md#módulos-y-dueños-de-los-datos). Se crean cuando la primera funcionalidad los necesita.
- Las convenciones de código, diseño visual y copy están en [CLAUDE.md](../CLAUDE.md).

## Superficies de la app

| Superficie | Rutas | Usuario | Registro |
|---|---|---|---|
| Pública | `/`, `/p/*`, `/reservar/*`, `/t/*` | Visitante y paciente | Expresivo: confianza y deleite |
| Panel | `/panel/*` | Profesional y secretaria | Sobrio y denso: velocidad |
| Admin | `/admin/*` | Nuestro equipo | Funcional |

El mapa completo de rutas y quién ve qué está en [docs/05-flujos-y-pantallas.md](../docs/05-flujos-y-pantallas.md#superficies-y-mapa-de-rutas).

## Estado por fase

| Fase | Alcance | Estado al 2026-11-21 |
|---|---|---|
| 0 · Agenda | Agenda del profesional y la secretaria, avisos, gestión del turno por link | Prototipo: agenda del día con carga de turnos y anti doble reserva |
| 1 · Marketplace | Buscador, mapa, perfil, reserva con pago | Esbozo: buscador con mapa, landing, reserva con pago simulado, usuarios de demo |
| 2 · Cobertura y confianza | Reseñas, turnos por prepaga, seguimiento de reintegros | Sin empezar |
| 3 · Plataforma clínica | Receta electrónica, historia clínica, estudios, instituciones | Sin empezar |

Lo que falta para cerrar la Fase 0, en épicas y cards, está en [plan-de-trabajo.md](plan-de-trabajo.md).
