# CLAUDE.md

Guía para trabajar en este repo con Claude. Es corta a propósito: el producto se define en `workspace/` y el detalle vive en `docs/`.

## Qué es

Turnos médicos particulares con precios transparentes, para Argentina. Primero, una agenda excelente para el profesional y su secretaria (Fase 0). Después, un buscador público con precios reales y reserva con pago (Fase 1).

## Punto de partida: `workspace/`

Antes de cualquier desarrollo nuevo, leé `workspace/`. Es la referencia de producto del proyecto:

| Archivo | Para qué |
|---|---|
| `workspace/README.md` | Cómo pasa una idea de exploración a decisión, a `docs/` y a código |
| `workspace/lineamientos.md` | Principios de producto, experiencia, ingeniería y datos. Si una tarea los contradice, frená y preguntá |
| `workspace/estructura.md` | Organización del repo, del código y de la documentación; estado por fase |
| `workspace/backend-y-datos.md` | Diseño propuesto del backend y la base: módulos y sus tablas, invariantes, máquina de estados, flujos críticos. Su tabla "Del prototipo a producción" lista lo que el código todavía tiene que cerrar |
| `workspace/decisiones/` | Decisiones de producto tomadas y por qué. No reabras una decisión registrada sin preguntar |
| `workspace/exploraciones/` | Ideas en análisis. **No son specs:** no se implementan hasta que haya una decisión |

El diseño de producto conceptual se trabaja en otra conversación, que escribe en `workspace/`. Desde el código no se edita `workspace/`; si aparece una pregunta de producto, se plantea en lugar de resolverla en el código.

**Fuente de verdad del detalle:** leé el doc que corresponda antes de diseñar o codear algo nuevo.

| Doc | Para qué |
|---|---|
| `docs/01-producto.md` | Usuarios, fases, métricas, políticas de cancelación |
| `docs/02-arquitectura.md` | Módulos, stack, flujos críticos, ADRs |
| `docs/03-modelo-de-datos.md` | Esquema, máquina de estados del turno |
| `docs/04-legal-y-riesgos.md` | Datos sensibles, regulación, riesgos de producto |
| `docs/05-flujos-y-pantallas.md` | Rutas, flujos de UI, estados visuales, orden de construcción |

Si una tarea contradice un doc, frená y preguntá. Si se toma una decisión nueva, actualizá el doc en el mismo cambio. Las decisiones de producto las registra la conversación de producto en `workspace/decisiones/`; desde el código solo se avisan.

## Forma de trabajo

- **Una sola confirmación por decisión.** Si el usuario ya eligió un enfoque o aprobó una propuesta, eso cubre también el diseño escrito y el plan que salen de ahí: no volver a pedir aprobación por lo mismo. Se pregunta solo lo nuevo que cambie lo que se construye; el resto se decide, se anota en el doc y se avisa al terminar.

## Reglas de producto (no negociables)

- **WhatsApp avisa, la app resuelve.** WhatsApp es el canal principal de aviso, pero solo de salida, con un botón de link. No hay botones de respuesta, chatbot ni interpretación de texto. Toda acción ocurre en nuestra UI.
- **Cero dobles reservas, garantizado por la base** (`EXCLUDE USING gist`). No reemplazarlo por chequeos en la app.
- **Las transiciones del turno pasan por la máquina de estados** de `modules/agenda`, nunca por un `UPDATE` suelto. Cada transición registra un `evento_turno`.
- **La plata se muestra siempre desglosada:** precio del profesional + cargo de servicio = total. Los montos se guardan en centavos (`bigint`).
- **La hora es siempre la de Argentina** (`America/Argentina/Buenos_Aires`), sin importar la zona del navegador o del servidor.
- **No hay datos clínicos en las Fases 0 y 1.** Las notas de turno son operativas.
- **Nunca se bloquea el uso por configuración incompleta.** Lo que falta bloquea *publicar*, no *usar la agenda*.

## Código

- **Stack:** Next.js (App Router) + TypeScript estricto + Postgres. En dev se usa PGlite en `.data/`; para resetear, borrar esa carpeta.
- **Arquitectura:** monolito modular. Cada módulo vive en `src/modules/<x>/` y expone su API en `index.ts`. Ningún módulo importa tablas de otro.
- **Lenguaje del dominio en español** (`turno`, `prestacion`, `consultorio`), igual que en la base. El código técnico genérico puede ir en inglés.
- **Sesión de demo hasta tener auth real:** `src/sesion.ts` lee el usuario desde una cookie que se elige en el selector "Ver como" del header. Hay tres roles:
  - **Visitante:** el default, sin cookie.
  - **Paciente:** usuarios de demo con datos y cobertura.
  - **Profesional.**

  Cada vista valida el rol en el servidor (quién ve qué está en `docs/05` → "Quién ve qué"), y las acciones toman al paciente o al profesional de la sesión, nunca del formulario.
- **Privacidad de la agenda:** sin cuenta solo se muestra el próximo turno de un profesional, nunca el calendario completo, ni en la UI ni en lo que se manda al navegador.
- **Datos personales sensibles** (DNI): se guardan cifrados con `src/cifrado.ts` (clave en `DATOS_CLAVE`; en dev hay una fija).
- **Mapa:** MapLibre con tiles de OpenFreeMap en el prototipo (MapTiler en producción). El worker se copia a `public/vendor/` en `postinstall` porque Turbopack no lo sirve. Si se actualiza `maplibre-gl`, correr `npm install`.
- **Cambios de esquema:** se agregan a `MIGRACIONES` en `src/db/schema.ts`. Tienen que ser idempotentes (`IF NOT EXISTS`) y se aplican solas al detectar que cambiaron, sin borrar `.data/`.
- **Reserva y pago:** los huecos salen de `modules/agenda` (`calcularGrilla`, función pura con tests). En el prototipo, el pago de Mercado Pago está **simulado** en `/reservar/pago/[token]`; en producción lo reemplaza el webhook (docs/02). Las URLs del paciente usan el `token` del turno, nunca el id.
- **Server Components por defecto.** Las mutaciones van con Server Actions que validan el input y el rol. `"use client"` solo donde hay interacción real.
- **SQL parametrizado siempre.** Nunca interpolar input del usuario.
- **Lógica de dominio** (cálculo de huecos, políticas, transiciones) en funciones puras con tests de Vitest. Los flujos críticos (cargar turno, reservar y pagar) llevan Playwright.
- **Antes de cerrar un cambio visible,** levantá el preview (`web` en `.claude/launch.json`) y verificalo en el navegador, en desktop y en 375 px.

## Copy

- Español rioplatense con voseo: "Elegí un horario", "Tu turno quedó confirmado".
- Corto y concreto. El copy dice qué pasó y qué podés hacer: "Ese horario se pisa con Juan P. 10:15–10:45" en lugar de "Error de validación".
- Fechas y horas a la argentina: "mar 17/11 · 10:30", formato de 24 h.
- Plata con `Intl.NumberFormat("es-AR")`, sin decimales.
- Términos del dominio: *turno*, *prestación*, *consultorio*, *profesional*, *secretaria* (en la UI, "secretario/a" solo donde haga falta).

## Diseño frontend

<frontend_aesthetics>
Tendés a converger en resultados genéricos, "en distribución", lo que produce la estética que se reconoce como "hecha por IA". Evitalo: este producto tiene que sentirse diseñado a propósito para su contexto, que es la salud privada en Buenos Aires, la confianza y la claridad sobre la plata.

**Tipografía.** Elegí fuentes con carácter, no genéricas. Prohibidas: Inter, Roboto, Arial, la fuente del sistema y Space Grotesk. Requisitos: buenos acentos y ñ, y cifras tabulares (horas y precios se alinean en columnas). Se cargan con `next/font`.

**Color y tema.** Una estética coherente, definida con variables CSS en `globals.css`. Un color dominante con acentos marcados funciona mejor que una paleta tímida y repartida. Nada de gradientes violetas sobre blanco. Los colores de estado del turno son semánticos y fijos (ver `docs/05-flujos-y-pantallas.md`): no se reusan para decorar. Hay modo claro y oscuro.

**Movimiento.** Usalo para los momentos de alto impacto. Una entrada de página bien orquestada, con apariciones escalonadas (`animation-delay`), deleita más que micro-interacciones dispersas. Preferí CSS; en React, Motion si ya está instalado. Respetá siempre `prefers-reduced-motion`.

**Fondos.** Generá atmósfera y profundidad, no un color plano por defecto: gradientes en capas, patrones geométricos sutiles o efectos que tengan que ver con el contexto.

**Evitá:** layouts y componentes predecibles, diseño de molde sin carácter propio, y defaults de librerías sin personalizar (shadcn/ui se usa como base y se tematiza, no se deja como viene).
</frontend_aesthetics>

### Dos registros, un solo sistema

La guía de arriba se aplica con intensidad distinta según la superficie:

| | Público (`/`, `/p/*`, `/t/*`) | Panel (`/panel/*`) |
|---|---|---|
| Objetivo | Confianza y deleite; reservar en < 2 min | Velocidad; cargar un turno en < 15 s |
| Carácter | Expresivo: fondos con atmósfera, entrada orquestada | Sobrio y denso: la información manda |
| Movimiento | Revelado escalonado al cargar la página | Solo feedback: turno recién creado, drawer, toast. Nada que demore al teclado |
| Fondos | Gradientes y patrones | Planos o casi; el color se reserva para los estados del turno |

Que sean dos registros no significa dos estéticas: se usan las mismas fuentes, tokens y radios.

### Consistencia por sobre variedad

La guía original pide variar entre generaciones. **En este repo es al revés:** una vez definidos la tipografía y los tokens, toda pantalla nueva los reusa. Para cambiar algo del sistema (una fuente, un color, un radio), se edita `globals.css` y esta sección en el mismo cambio, nunca un valor suelto en un componente.

### El sistema: "Consultorio porteño" con precio en comprobante

Cálido y confiable, como un consultorio con historia. Se aleja a propósito del azul y blanco genérico de las apps de salud.

**Tipografía** (cargada con `next/font` en `src/app/layout.tsx`):

| Variable | Fuente | Uso |
|---|---|---|
| `--font-display` | Newsreader | Nombres de profesionales, títulos (`h1`, `h2`, `.display`). Nunca en texto corrido ni en el panel denso |
| `--font-ui` | Schibsted Grotesk | Todo el resto de la interfaz |
| `--font-num` | Spline Sans Mono | Horas, precios, fechas cortas: todo número que se compara en columna (`.mono`) |

**Color** (tokens en `src/app/globals.css`, con modo claro y oscuro):

- **Papel crema** (`--bg`) + **tinta verde oscura** (`--ink`).
- **Verde botella** (`--accent`): color dominante. Acciones, CTAs y estado verificado.
- **Ladrillo** (`--fresh`): solo para la frescura del precio ("actualizado hace N días") y el punto de la marca. No se usa en botones ni en estados.
- **Estados del turno** (`--st-*`): azul pizarra para reservado/confirmó, gris verde para atendido, bordó para ausente y ocre punteado para esperando pago. Se aplican con `.estado.<clase>` y `.turno.<clase>`.

**Precio en formato comprobante.** Todo precio que vea el paciente usa `.recibo`: líneas en `--font-num`, cortes punteados arriba y abajo, y una línea llena antes del total. Las líneas muestran solo la cifra (`cifra()`) y el total lleva el signo (`money()`). En el resumen antes de pagar se suma la línea "Al profesional".

### Básicos que no se negocian

- Mobile first en lo público; el panel se diseña para desktop y se prueba en celular.
- Contraste AA, foco visible y todo operable con teclado (la secretaria trabaja con teclado).
- Cada pantalla diseña sus estados vacío, de carga y de error. No solo el camino feliz.
