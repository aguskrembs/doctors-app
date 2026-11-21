# Decisiones de producto

Registro de lo que se decidió, por qué y qué se descartó. Una decisión no se reescribe: si cambia, se agrega una nueva que la reemplaza y se marca la vieja como **Reemplazada por P-NNN**.

## Cómo registrar una

1. Copiá [_plantilla.md](_plantilla.md) como `P-NNN-titulo-corto.md`, con el siguiente número libre.
2. Completala y agregala a la tabla de abajo.
3. En el mismo cambio, bajá la decisión al doc de `docs/` que corresponda.

## Registro

| # | Decisión | Estado | Fecha |
|---|---|---|---|
| — | Todavía no hay decisiones registradas en este formato | — | — |

## Decisiones anteriores a este registro

Se tomaron antes de existir esta carpeta y siguen vigentes donde están escritas:

- **ADR 001–008** (arquitectura: monolito modular, Postgres, anti doble reserva en la base, Mercado Pago marketplace, multi-organización, receta vía RCTA, Inngest, WhatsApp solo para avisar): [docs/02-arquitectura.md](../../docs/02-arquitectura.md#decisiones-adr-resumidos).
- **Pago adelantado obligatorio para turnos particulares, suscripción más comisión visible, políticas de cancelación estándar:** [docs/01-producto.md](../../docs/01-producto.md).
- **Visitante limitado al próximo turno, DNI cifrado, usuarios de demo:** [docs/superpowers/specs/2026-11-15-landing-y-usuarios-design.md](../../docs/superpowers/specs/2026-11-15-landing-y-usuarios-design.md).

## Abiertas

Preguntas con recomendación pero sin decisión final. Cuando se cierren, pasan al registro.

- **D1–D6** (sobreturnos, grilla de la agenda, tratamientos de varias sesiones, buffer, login, mismo profesional en dos consultorios): [docs/05-flujos-y-pantallas.md](../../docs/05-flujos-y-pantallas.md#decisiones-abiertas).
- **Valor del cargo de servicio.** Hoy es un 5% de ejemplo en el prototipo.
