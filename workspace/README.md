# Workspace de producto

> Punto de entrada al proyecto. Actualizado: 2026-11-21.

Acá vive el pensamiento de producto: los lineamientos que no cambian seguido, el mapa del proyecto, las ideas en exploración y las decisiones tomadas. Antes de diseñar o codear algo nuevo, se empieza por acá.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| [lineamientos.md](lineamientos.md) | Principios generales de producto, experiencia, ingeniería, datos y forma de trabajo. Es lo primero que se lee |
| [estructura.md](estructura.md) | Cómo está organizado el repo, el código y la documentación, y en qué fase está cada cosa |
| [backend-y-datos.md](backend-y-datos.md) | Diseño propuesto del backend y la base de datos: módulos, modelo, invariantes, flujos críticos y qué le falta al prototipo |
| [exploraciones/](exploraciones/) | Ideas de producto en análisis, que todavía no son una decisión |
| [decisiones/](decisiones/) | Registro de decisiones de producto tomadas, con su porqué |

## Cómo se usa: de una idea al código

Una idea pasa por cuatro lugares. Cada paso deja algo escrito, así el chat de código no tiene que adivinar.

```
exploraciones/   →   decisiones/   →   docs/            →   src/
idea en análisis     qué se decidió     especificación       implementación
y opciones           y por qué          vigente (el "qué")
```

1. **Exploración.** Una idea nueva o una pregunta abierta se escribe en `exploraciones/`, con el problema, las opciones y lo que falta saber. Se puede quedar ahí todo lo que haga falta.
2. **Decisión.** Cuando se elige un camino, se registra en `decisiones/` con el contexto, la opción elegida, las descartadas y sus consecuencias.
3. **Especificación.** La decisión se baja al doc que corresponde en `docs/` (producto, arquitectura, modelo de datos, legal o flujos), en el mismo cambio. `docs/` siempre describe cómo es el producto hoy.
4. **Código.** El desarrollo lee `docs/` y los lineamientos. Si al codear aparece una pregunta de producto, vuelve al paso 1 en lugar de resolverse en el código.

## Dos conversaciones, un repo

- **Producto** (conceptual): trabaja en `workspace/` y, cuando hay decisión, en `docs/`. No toca `src/`.
- **Código**: trabaja en `src/` y sigue `CLAUDE.md`. Si una tarea contradice un lineamiento o un doc, frena y pregunta.

Como ambas trabajan sobre la misma carpeta, cada una commitea solo sus propios archivos.

## Estado en una línea

Fase 0 (agenda del profesional) en prototipo, con la Fase 1 (buscador y reserva con pago simulado) esbozada encima. Piloto con 4 profesionales en CABA y San Isidro. Detalle en [estructura.md](estructura.md#estado-por-fase).
