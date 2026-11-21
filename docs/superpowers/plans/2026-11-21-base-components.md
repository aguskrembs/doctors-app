# Componentes base tematizados (E0-K1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Librería de componentes en `src/components/ui/` con Tailwind v4 + shadcn/ui tematizados con el sistema "Consultorio porteño", usada por las pantallas actuales y mostrada en `/system`, más lineamientos escritos en `docs/06-design-system.md`.

**Architecture:** Los tokens siguen en `globals.css` (una sola fuente) y se exponen a Tailwind con `@theme inline`. El CSS actual pasa a `@layer legacy` para que las utilidades de los componentes le ganen, y cada clase migrada se borra de ahí. Componentes al estilo shadcn (copiados al repo, `cva`, Radix para popover y diálogo/drawer, `sonner` para toast), con `<select>` nativo.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind v4 (`@tailwindcss/postcss`), `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-popover`, `@radix-ui/react-dialog`, `sonner`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-base-components-design.md`

## Global Constraints

- Tokens y paleta no cambian de valor ni de nombre en `globals.css`; los componentes no llevan colores literales ni `dark:` repartido (spec: "Los componentes no llevan colores propios").
- Fuentes: `--font-display` Newsreader solo en títulos y nombres de profesionales; `--font-ui` Schibsted Grotesk; `--font-num` Spline Sans Mono (clase `font-mono`) para horas, precios y fechas.
- Radios: `--radius` 10px y `--radius-sm` 6px. Corte celular/desktop: 720 px (el que ya usa el repo para hojas).
- Controles de 44 px de alto en celular.
- Estados del turno: color + ícono + texto; una sola fuente del mapa estado → presentación.
- Movimiento solo de feedback y con `prefers-reduced-motion` respetado.
- Código nuevo en inglés: carpetas, archivos, componentes, props y variables (`Button`, `Field`, `Card`). Los `.md` van en castellano y el texto de la UI también. Lo que ya existe (módulos, tablas, nombres de dominio como `turno`) no se renombra.
- Copy rioplatense con voseo; plata con `cifra()`/`money()` de `src/lib.ts`; horas `HH:MM` 24 h.
- No se edita `workspace/`.
- Cambios al sistema: `globals.css` y la sección "Diseño frontend" de `CLAUDE.md` en el mismo commit.
- Commits en la rama `claude/dazzling-keller-7jnmqc`, con las dos líneas de atribución del sistema al final del mensaje.

## Review Focus

1. Estado de turno que la base devuelve y no está en el mapa (p. ej. un estado futuro): se muestra el texto crudo con estilo neutro y no rompe (test en Task 3).
2. Escape cierra diálogo, drawer y popover, y el foco vuelve al botón que los abrió; Tab no se escapa de un diálogo abierto (verificación con teclado en Tasks 6 y 7).
3. Texto largo ("Dra. María de los Ángeles Fernández Echeverría" en badge, botón o fila) no desborda ni genera scroll horizontal a 375 px (sección "Texto largo" de `/system`, Task 2, que cada componente suma).
4. Un campo con error expone `aria-invalid` y `aria-describedby` apuntando al mensaje, y el mensaje es visible sin depender del color (test en Task 5).
5. Dos toasts seguidos se apilan y se anuncian, y en celular no tapan la zona inferior donde irá la barra del panel (E0-K2): el toast va arriba en celular (Task 8).

---

### Task 1: Base de Tailwind, capas y temas

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/app/globals.css`, `src/app/layout.tsx`
- Create: `postcss.config.mjs`, `src/components/ui/cn.ts`, `src/components/ui/tokens-contrast.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` (en `src/components/ui/cn.ts`, `twMerge(clsx(inputs))`). Utilidades de Tailwind mapeadas a los tokens: `bg-bg`, `bg-surface`, `bg-surface-sunk`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `text-on-accent`, `bg-accent-soft`, `text-accent`, `text-fresh`, `text-warn`, `bg-warn-soft`, `text-err`, `bg-err-soft`, `border-st-reservado`, `bg-st-reservado`, `text-on-reservado`, `text-st-atendido`, `bg-st-atendido-soft`, `text-st-ausente`, `bg-st-ausente-soft`, `text-st-pendiente`, `font-sans`, `font-display`, `font-mono`, `rounded-md` (= `--radius`), `rounded-sm` (= `--radius-sm`). Tema forzable con `<html data-theme="light|dark">`.

- [ ] **Step 1: Capturar la línea base visual.** Con `npm run dev`, sacar capturas (Playwright, `require('playwright')`, 1280 px y 375 px, claro y oscuro con `colorScheme`) de `/`, `/mis-datos` (sesión paciente), `/reservar/1` y `/panel/agenda` (sesión profesional), guardadas en el scratchpad. Sirven para comparar al final de cada tarea; no se commitean.
- [ ] **Step 2: Instalar** `tailwindcss @tailwindcss/postcss postcss clsx tailwind-merge class-variance-authority`. Crear `postcss.config.mjs` con el plugin `@tailwindcss/postcss`.
- [ ] **Step 3: Escribir el test de contraste.** `tokens-contrast.test.ts` lee `src/app/globals.css`, extrae los tokens del bloque claro y del oscuro (`:root{}` y el bloque oscuro) y afirma ratio ≥ 4.5 para: `ink/bg`, `ink/surface`, `muted/bg`, `muted/surface`, `on-accent/accent`, `accent/accent-soft`, `accent/surface`, `warn/warn-soft`, `err/err-soft`, `on-reservado/st-reservado`, `st-atendido/st-atendido-soft`, `st-ausente/st-ausente-soft`, `st-pendiente/surface`, `fresh/surface` en ambos temas. Correr: falla porque el bloque oscuro forzado aún no existe como `[data-theme="dark"]`.
- [ ] **Step 4: Reestructurar `globals.css`.** Orden: `@layer theme, base, legacy, components, utilities;` luego `@import "tailwindcss"` por capas (`theme`, `preflight` en `base`, `utilities`); tokens `:root` (sin cambios de valor); oscuro duplicado en `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }` y `:root[data-theme="dark"] {...}`, con `color-scheme` en cada uno; `@theme inline` con el mapeo de Interfaces (fuentes: `--font-sans: var(--font-ui)`, `--font-mono: var(--font-num)`); todo el CSS existente restante envuelto en `@layer legacy { ... }`. Si algún par falla AA en el test, ajustar el token solo lo mínimo y anotarlo en `CLAUDE.md`.
- [ ] **Step 5: Correr** `npx vitest run src/components/ui/tokens-contrast.test.ts` → PASS. `npx tsc --noEmit` y `npm run build` → sin errores.
- [ ] **Step 6: Comparar con la línea base.** Las cuatro pantallas no deben cambiar de aspecto (preflight de Tailwind toca títulos, `nav`, `label`, `select`, botones). Corregir en `legacy` lo que cambie.
- [ ] **Step 7: Commit** `Base de Tailwind v4 con capas y temas forzables`.

### Task 2: Página `/system` y switch de tema

**Files:**
- Create: `src/app/system/page.tsx`, `src/app/system/theme-switch.tsx`, `src/app/system/section.tsx`

**Interfaces:**
- Produces: `Section({ id, title, children })` (server) para que cada tarea siguiente agregue su bloque; `ThemeSwitch()` (client) que alterna `document.documentElement.dataset.theme` entre `light` y `dark` y arranca desde el tema del sistema, dentro de `try/catch` por si falla `localStorage`. La página lleva `export const metadata = { robots: { index: false } }` y una nota "Solo para desarrollo".

- [ ] **Step 1:** Crear la página con el título, `ThemeSwitch` en un header pegajoso y una sección "Texto largo" vacía que las tareas 3–7 completan.
- [ ] **Step 2: Verificar** en el navegador `/system` a 1280 px y 375 px: el switch cambia el tema de toda la página, sin scroll horizontal.
- [ ] **Step 3: Commit** `Página /system con switch de tema`.

### Task 3: Badge y estado del turno

**Files:**
- Create: `src/components/ui/badge.tsx`, `src/components/ui/appointment-status.ts`, `src/components/ui/appointment-status.tsx`, `src/components/ui/appointment-status.test.ts`
- Modify: `src/app/panel/agenda/page.tsx`, `src/app/system/page.tsx`, `src/app/tarjeta-profesional.tsx`, `src/app/mis-datos/page.tsx`, `src/app/globals.css` (borrar `.badge*`, `.estado*`, `.turno*` de `legacy`)

**Interfaces:**
- Produces: `Badge({ tone?: "warning"|"ok"|"soon", className?, children })` (reemplaza `.badge`, `.badge.ok`, `.badge-pronto`). En `appointment-status.ts`: `type StatusKind = "booked"|"confirmed"|"attended"|"absent"|"pending"|"cancelled"|"unknown"`; `statusPresentation(estado: string, opts?: { confirmed?: boolean }): { label: string; kind: StatusKind }` con el mapa de la agenda actual (`CONFIRMADO`→"Reservado", `CONFIRMADO`+`confirmo`→"✓ Confirmó", `PENDIENTE_PAGO`→"Esperando pago", `ATENDIDO`, `AUSENTE`, `CANCELADO`, `EXPIRADO`→"No se pagó") y `appointmentBorder(kind: StatusKind): string` (clases de Tailwind del borde izquierdo de la fila: `pending` punteado). `AppointmentStatus({ status: string; confirmed?: boolean; className? })` renderiza texto + ícono SVG inline (`aria-hidden`) con el tratamiento de docs/05.

- [ ] **Step 1: Test** `appointment-status.test.ts`: `statusPresentation("CONFIRMADO")` → `{label:"Reservado", kind:"booked"}`; con `{confirmed:true}` → kind `confirmed`; `"EXPIRADO"` → label "No se pagó"; `statusPresentation("ALGO_NUEVO")` → `{label:"ALGO_NUEVO", kind:"unknown"}`.
- [ ] **Step 2:** Correr → FAIL. Implementar `appointment-status.ts` y volver a correr → PASS.
- [ ] **Step 3:** Implementar `AppointmentStatus` y `Badge`. Migrar la agenda (borrar su `ESTADO` local y usar `AppointmentStatus` + `appointmentBorder`), y los `.badge` de `tarjeta-profesional.tsx`, `mis-datos/page.tsx` y de la landing.
- [ ] **Step 4:** Sección "Estados del turno y badges" en `/system`: todos los estados, `unknown` y el caso de texto largo.
- [ ] **Step 5: Verificar** `/panel/agenda` y `/system` en claro/oscuro, 1280 y 375 px; comparar con la base. `npx vitest run`, `npx tsc --noEmit`.
- [ ] **Step 6: Commit** `Badge y AppointmentStatus con mapa único`.

### Task 4: Botón, chip y alerta

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/chip.tsx`, `src/components/ui/alert.tsx`
- Modify: usos de `.btn`, `.btn-texto`, `.btn-claro`, `.btn-pagar`, `.btn.sm`, `.chip`, `.alert` en `src/app/**` (landing, tarjeta, reserva, pago, confirmado, form-paciente, agenda, vista-mapa) y `globals.css`; `src/app/system/page.tsx`

**Interfaces:**
- Produces: `buttonVariants` (`cva`, exportado, para usar en `<Link className={buttonVariants({...})}>`); `Button(props: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>)` con `variant: "primary"|"light"|"text"|"ghost"` (default `primary`), `size: "md"|"sm"` (default `md`), `block?: boolean`; alto 44 px en celular y compacto desde `md`. `Chip(props: ButtonHTMLAttributes & { active?: boolean })` con `aria-pressed`. `Alert({ tone: "error"|"ok"|"warning", children })` con `role="alert"` para error y `role="status"` para el resto.

- [ ] **Step 1:** Implementar los tres, con foco visible (`outline` del token `accent`) y estado `disabled` (opacidad .55, `cursor-not-allowed`).
- [ ] **Step 2:** Migrar todos los usos (los `Link` usan `buttonVariants`). `.btn-filtros` y `.switch-vista` son específicos del mapa y quedan.
- [ ] **Step 3:** Sección "Botones, chips y alertas" en `/system`: variantes × tamaños × (normal, hover, foco, deshabilitado), `Button` con texto largo, `bloque`.
- [ ] **Step 4: Verificar** con teclado (Tab muestra foco; Enter/Espacio activan) y en las pantallas migradas contra la base, 375 y 1280 px, claro y oscuro. `npm run build`.
- [ ] **Step 5: Commit** `Button, Chip y Alerta`.

### Task 5: Campo, input y select

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/field.tsx`, `src/components/ui/field.test.tsx`
- Modify: `src/app/mis-datos/form-paciente.tsx`, `src/app/selector-rol.tsx`, `src/app/panel/agenda/page.tsx`, `src/app/reservar/[id]/page.tsx`, `src/app/vista-mapa.tsx` (inputs/selects), `globals.css` (borrar reglas globales `label`, `select, input`, `.campo-error`, `.form`, `.fila-2`, `.grupo-datos` ya migradas), `src/app/system/page.tsx`
- Dev dependencies: `@testing-library/react`, `jsdom` (el test de este componente corre con `// @vitest-environment jsdom`)

**Interfaces:**
- Produces: `Input` y `Select` (`forwardRef`, mismas props que el elemento nativo, más `invalid?: boolean` que setea `aria-invalid`); `Field({ label: string; hint?: string; error?: string; id?: string; children: ReactElement })` que une etiqueta, control, ayuda y error generando `id`s con `useId()` y clonando el hijo con `id`, `aria-describedby` y `aria-invalid`. El error lleva un ícono además del color y `role="alert"` no (evita doble anuncio); se lee por `aria-describedby`.

- [ ] **Step 1: Test** `field.test.tsx`: con `error="Ingresá un DNI válido"`, el input tiene `aria-invalid="true"`, su `aria-describedby` apunta a un nodo con ese texto, y la etiqueta lo nombra (`getByLabelText`). Sin error pero con `ayuda`, `aria-describedby` apunta a la ayuda y no hay `aria-invalid`.
- [ ] **Step 2:** Correr → FAIL; implementar; correr → PASS.
- [ ] **Step 3:** Migrar `Field` local de `form-paciente.tsx` (se elimina el suyo) y los demás formularios. Conserva `name`, `defaultValue` y el comportamiento de `useActionState`.
- [ ] **Step 4:** Sección "Campos" en `/system`: normal, con ayuda, con error, deshabilitado, `select`, `type="time"`, etiqueta larga.
- [ ] **Step 5: Verificar** en `/mis-datos` (paciente): enviar vacío muestra errores; foco visible; a 375 px los controles miden 44 px y no hay zoom de iOS (fuente ≥ 16 px en celular). `npx vitest run`.
- [ ] **Step 6: Commit** `Field, Input y Select accesibles`.

### Task 6: Tarjeta, recibo y estado vacío

**Files:**
- Create: `src/components/ui/card.tsx`, `src/components/ui/receipt.tsx`, `src/components/ui/empty.tsx`
- Modify: `src/app/reservar/resumen-turno.tsx`, `src/app/tarjeta-profesional.tsx`, `src/app/mis-datos/page.tsx`, `src/app/reservar/**`, `src/app/panel/agenda/page.tsx`, `globals.css` (borrar `.card`, `.panel`, `.paso`, `.recibo`, `.fresh`, `.aviso-paso`, `.lista-ficha` migrados), `src/app/system/page.tsx`

**Interfaces:**
- Produces: `Card({ as?: "section"|"article"|"aside"|"div"; variant?: "card"|"panel"|"step"; className?, children })` (misma superficie; `panel` más densa para el panel de trabajo). `Receipt({ lines: { label: string; cents: number; secondary?: boolean }[]; total: { label: string; cents: number }; toProfessional?: number })` que dibuja el formato comprobante con `cifra()` en las líneas, `money()` en el total y la línea "Al profesional" solo si se pasa `toProfessional`. `Empty({ title: string; detail?: string; action?: ReactNode })`.

- [ ] **Step 1:** Implementar los tres. `Receipt` conserva: cortes punteados arriba/abajo, línea llena antes del total, `font-mono` con cifras tabulares.
- [ ] **Step 2:** Migrar `resumen-turno.tsx` y `tarjeta-profesional.tsx` a `Receipt` y `Card`; resto de pantallas a `Card`; la agenda vacía usa `Empty`.
- [ ] **Step 3:** Sección "Superficies y comprobante" en `/system` (incluye un `Receipt` con montos de siete cifras para ver que no desborda).
- [ ] **Step 4: Verificar** que `/reservar/*` y `/` coinciden con la base en ambos temas y anchos; los montos no cambiaron. `npm run build`.
- [ ] **Step 5: Commit** `Card, Receipt y Empty`.

### Task 7: Diálogo y drawer

**Files:**
- Create: `src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`
- Modify: `src/app/vista-mapa.tsx` (modal de filtros), `globals.css` (borrar `.modal-*` migradas), `src/app/system/demos.tsx` (nuevo, client), `src/app/system/page.tsx`
- Dependencies: `@radix-ui/react-dialog`

**Interfaces:**
- Produces: `Dialog({ open, onOpenChange, title, description?, children, footer? })` (modal centrado ≥ 721 px, hoja inferior con agarre ≤ 720 px, fondo con blur como el actual). `Drawer({ open, onOpenChange, title, side?: "right", children, footer? })` (panel lateral de 400 px en desktop, hoja inferior en celular, scroll interno y pie fijo). Ambos sobre Radix Dialog: foco atrapado, Escape, devolución del foco al disparador, título obligatorio (`Dialog.Title`). Entrada con animación de CSS, desactivada con `prefers-reduced-motion`.

- [ ] **Step 1:** Implementar ambos con tokens (`bg-surface`, `border-line`, sombras existentes). 
- [ ] **Step 2:** Migrar el modal de filtros de `vista-mapa.tsx` a `Dialog`. Verificar en `/` (visitante, vista mapa) que abre, que Escape lo cierra a él y no a la hoja del profesional, que el mapa sigue navegable al cerrar y que Aplicar/Limpiar funcionan. Si no se puede conservar ese comportamiento, **revertir solo esa migración**, dejar el `<dialog>` y anotarlo en el commit.
- [ ] **Step 3:** Demos en `/system/demos.tsx`: botón que abre un `Dialog` con formulario y otro que abre un `Drawer` con contenido largo (para probar scroll y pie fijo).
- [ ] **Step 4: Verificar con teclado** (Review Focus 2): abrir con Enter, Tab no sale del diálogo, Escape cierra y el foco vuelve al botón. A 375 px ambos son hoja inferior sin desbordar; con `prefers-reduced-motion` no hay animación.
- [ ] **Step 5: Commit** `Dialog y Drawer sobre Radix`.

### Task 8: Popover y toast

**Files:**
- Create: `src/components/ui/popover.tsx`, `src/components/ui/toast.tsx`
- Modify: `src/app/layout.tsx` (montar `<Toaster />`), `src/app/mis-datos/form-paciente.tsx` (el "Datos guardados" pasa a toast, conservando `role="status"` visible), `src/app/system/demos.tsx`, `globals.css`
- Dependencies: `@radix-ui/react-popover`, `sonner`

**Interfaces:**
- Produces: `Popover`, `PopoverTrigger`, `PopoverContent({ side?, align?, children, className? })` (re-exports de Radix con estilo; colisión con el borde de pantalla activada, `sideOffset` 8, ancho por contenido con máximo `calc(100vw - 32px)`). `Toaster()` (client, `position` arriba-centro en celular y abajo-derecha en desktop, tema siguiendo `data-theme`/system vía tokens) y `notify(message: string, opts?: { tone?: "ok"|"error"|"aviso"; action?: { label: string; onClick: () => void } }): void`. El toast con `accion` es la base del "Deshacer" de E1-L5.

- [ ] **Step 1:** Implementar ambos; el toast hereda los tokens (nada de los colores por defecto de sonner) y la fuente `--font-ui`.
- [ ] **Step 2:** Demos: popover con un campo y botón (abre cerca del borde derecho para ver la colisión), y tres botones de toast (ok, error, con acción "Deshacer"); disparar dos seguidos.
- [ ] **Step 3: Verificar** (Review Focus 2 y 5): Escape cierra el popover y devuelve el foco; a 375 px el popover no se corta; dos toasts se apilan y se anuncian; el toast no queda abajo en celular. Con `prefers-reduced-motion`, sin animación.
- [ ] **Step 4: Commit** `Popover y toast`.

### Task 9: Lineamientos, limpieza y cierre

**Files:**
- Create: `docs/06-design-system.md`
- Modify: `CLAUDE.md`, `docs/02-arquitectura.md` (solo si menciona el stack de frontend), `globals.css` (borrar lo que quedó muerto en `legacy`), `package.json` si falta algún script

- [ ] **Step 1: Escribir `docs/06-design-system.md`**, corto y accionable: (1) cómo está armado el sistema (tokens → `@theme` → componentes), (2) inventario de componentes con cuándo usar cada uno y su ruta en `/system`, (3) cuándo crear un componente nuevo y cuándo componer los existentes, con la receta paso a paso (archivo en `src/components/ui/`, `cva` para variantes, tokens y no valores sueltos, sección en `/system` con todos sus estados), (4) reglas de claro/oscuro (sin `dark:`, tokens semánticos, los colores de estado no decoran), (5) celular vs desktop (corte 720 px, 44 px táctil, hoja inferior), (6) accesibilidad (foco, teclado, `aria-*`, AA, `prefers-reduced-motion`), (7) copy y formatos, (8) lista de verificación antes de cerrar un componente.
- [ ] **Step 2: Actualizar `CLAUDE.md`:** stack (Tailwind v4 + shadcn/ui), fila nueva en la tabla de docs para `docs/06`, mención de `/system`, y en "Consistencia por sobre variedad" que los tokens se editan en `globals.css` y esa sección en el mismo cambio. Sin duplicar el contenido del doc 06.
- [ ] **Step 3: Limpieza.** Buscar en `legacy` reglas sin uso (`grep` de cada clase en `src/`) y borrarlas; lo que quede es lo específico de pantallas no migradas (landing, mapa, calendario).
- [ ] **Step 4: Verificación final.** `npx tsc --noEmit`, `npx vitest run` y `npm run build` en verde. Recorrido en navegador de `/system`, `/`, `/reservar/*`, `/mis-datos`, `/panel/agenda`, a 1280 y 375 px, claro y oscuro, comparando con la línea base; sin scroll horizontal ni errores en consola.
- [ ] **Step 5: Commit** `Lineamientos del sistema de diseño y cierre de E0-K1`, y `git push -u origin claude/dazzling-keller-7jnmqc`.
