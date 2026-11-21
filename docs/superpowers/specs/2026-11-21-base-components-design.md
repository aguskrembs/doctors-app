# Componentes base tematizados (E0-K1)

> Estado: aprobado · 2026-11-21 · Card E0-K1 de `workspace/plan-de-trabajo.md`

## Intención

Hoy todo el estilo es un `globals.css` de 385 líneas con clases globales y cada pantalla repite el marcado a mano. E1 (agenda, popover de carga rápida, hoja del turno) necesita piezas compartidas y accesibles, en desktop y celular, en claro y oscuro. Esta card crea la librería y los lineamientos para que lo que venga reuse y no invente.

## Objetivos

1. Librería en `src/components/ui/` con: botón, input, select, campo (label + ayuda + error), popover, drawer, diálogo, toast y badge de estado del turno. Más lo que ya está en uso: chip, card, alerta, recibo y estado vacío.
2. Las pantallas actuales usan esos componentes en lugar de clases sueltas.
3. Claro y oscuro con los tokens de `globals.css`. Los componentes no llevan colores propios ni `dark:` repartido.
4. Una página de muestra en **`/system`** que muestra cada componente, en todos sus estados, con un switch claro/oscuro y en cualquier ancho.
5. Lineamientos escritos en `docs/06-design-system.md`, enlazados desde `CLAUDE.md`.

## No objetivos

- Reescribir las pantallas de punta a punta. Lo específico de una pantalla (landing, mapa, calendario de reserva, hoja del profesional) queda como está hasta que se toque.
- Cambiar la estética: mismas fuentes, tokens, radios y colores de estado.
- Estados de carga/vacío/error como patrones completos: es E0-K3. Acá solo el estado vacío mínimo que ya se usa.
- Esqueleto del panel (E0-K2) y Playwright (E0-K4).

## Anti-objetivos

- Que se vea como shadcn "de fábrica". Todo se tematiza con los tokens porteños.
- Que `/system` sea accesible para pacientes o aparezca en la navegación.
- Duplicar tokens en dos lugares.

## Enfoque elegido: Tailwind v4 + shadcn/ui (opción C)

Se evaluó (A) todo nativo con CSS a mano, (B) nativo + Radix para popover y toast, y (C) Tailwind + shadcn/ui. Se eligió C: el equipo no quiere mantener estilos en vanilla, y shadcn da componentes accesibles que se copian al repo y se tematizan.

Decisiones de cómo, ya tomadas:

- **Tokens:** siguen en `globals.css` como variables CSS (`--bg`, `--accent`, `--st-*`…), una sola fuente. Se mapean a Tailwind con `@theme inline` (`bg-surface`, `text-ink`, `border-line`, `text-accent`…). Los nombres de shadcn (`background`, `primary`, `destructive`…) se alias a los nuestros.
- **Oscuro:** los tokens ya cambian con `prefers-color-scheme`. Se suma `[data-theme="dark"|"light"]` en `<html>` para forzarlo (lo usa `/system`). Como los tokens cambian de valor, los componentes casi nunca necesitan `dark:`.
- **Convivencia con el CSS actual:** el CSS sin capa le gana siempre a las utilidades de Tailwind. Por eso el CSS existente pasa a `@layer legacy`, declarada entre `base` y `components`: `@layer theme, base, legacy, components, utilities`. Así los componentes nuevos ganan donde se usan, y lo viejo sigue igual donde no se migró. Cada clase migrada se borra de `legacy`.
- **Preflight de Tailwind:** se importa, y se revisan las pantallas actuales (títulos, `nav`, `label`, `select`) para que no cambien de aspecto.
- **Primitivas:** Radix (`popover`, `dialog` para diálogo y drawer) y `sonner` para el toast, tematizado. `class-variance-authority`, `clsx` y `tailwind-merge` para las variantes. El `<select>` es el nativo, estilado: en celular abre el selector del sistema y con teclado es lo más rápido.
- **Drawer:** un solo componente, lateral en desktop y hoja inferior en celular (≤ 720 px, el mismo corte que ya usa el repo). El diálogo (modal centrado en desktop, hoja inferior en celular) reemplaza al `<dialog>` del modal de filtros.
- **Táctil:** controles de 44 px de alto en celular; en desktop del panel pueden ser más densos.
- **Estado del turno:** un único mapa `estado → texto, color, ícono` en `AppointmentStatus`; la agenda deja de tener el suyo. Cumple docs/05: color + ícono + texto.
- **Movimiento:** solo feedback (entrada de drawer, popover y toast), con `prefers-reduced-motion` respetado.

## Qué se migra

Usan los componentes nuevos: `selector-rol`, `form-paciente`, `resumen-turno`, formulario y lista de la agenda del panel, pago y confirmación de la reserva, filtros del buscador, tarjeta del profesional. Si migrar el modal de filtros rompe el mapa (Escape, foco, `backdrop`), se deja como está y se anota.

## A cargo del implementador

- Nombres exactos de props y de archivos, dentro de `src/components/ui/` (un archivo por componente, nombres de dominio en español).
- Tamaños, espaciados y sombras finos, siempre derivados de los tokens y radios existentes.
- Qué clases de `legacy` quedan sin uso y se borran.

## Verificación

`tsc`, `next build` y `vitest` en verde (con un test del mapa de estados). Verificación visual en navegador, claro y oscuro, a 1280 px y a 375 px: `/system`, `/`, `/reservar/*`, `/mis-datos`, `/panel/agenda`. Contraste AA de los pares de tokens, foco visible y operación solo con teclado de popover, drawer y diálogo.

## Cambios de docs

- Nuevo `docs/06-design-system.md`: anatomía de un componente, cuándo crear uno nuevo, tokens, estados, accesibilidad, claro/oscuro, celular vs desktop, copy.
- `CLAUDE.md`: stack (Tailwind + shadcn), puntero al doc 06 y a `/system`, y la regla de que para cambiar el sistema se edita `globals.css` y la sección de diseño en el mismo cambio.
- `workspace/` no se edita desde el código: se avisa que la card queda hecha.
