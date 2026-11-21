# Landing, usuarios de demo y "Mis datos"

> Estado: aprobado e implementado · 2026-11-15 (con dos cambios del usuario: DNI cifrado y visitante limitado al próximo turno)

## Intención

Hoy `/` es el buscador y solo lo ve un "paciente" sin identidad. Queremos que la primera visita **venda el producto** a sus dos públicos (pacientes y profesionales) sin esconder lo más valioso, que son los precios reales. También queremos que quien tiene sesión iniciada vaya directo a su herramienta, sin marketing.

Para que la demo se sienta real, los usuarios de prueba tienen datos personales y coberturas distintas. Así se ve cómo cambia la experiencia según la prepaga, y la reserva deja de pedir datos que ya conocemos.

## Objetivos

1. **Selector "Ver como" con tres tipos de usuario:**
   - Visitante (sin registrar).
   - Pacientes de prueba con datos y cobertura.
   - Profesionales.
2. **Logo e inicio por rol:**
   - Visitante → landing en `/`.
   - Paciente → buscador en `/`, sin marketing.
   - Profesional → `/panel/agenda`.
3. **Landing para el visitante:** el buscador integrado arriba de todo, y abajo secciones para pacientes y para profesionales. El botón **"Sumate"** está visible y deshabilitado.
4. **Cobertura en las tarjetas:** con sesión de paciente, cada tarjeta dice qué pasa con *su* cobertura con ese profesional.
5. **Vista "Mis datos"** (`/mis-datos`), según el rol:
   - Paciente: datos editables.
   - Profesional: solo lectura.
6. **Reserva sin "Tus datos":** el turno toma al paciente de la sesión.

## No objetivos

- Login real, registro o recuperación de cuenta (sigue la sesión de demo).
- El formulario de "Sumate" y la validación de profesionales por nuestro equipo (el botón queda deshabilitado).
- Reservar *por cobertura* (convenio sin pago o con seña del plus): es Fase 2. La reserva online sigue siendo particular, y la cobertura solo se informa.
- Editar los datos del profesional (consultorios, horarios, precios): va en `/panel/ajustes`.
- Una pantalla "Mis turnos" del paciente.

## Anti-objetivos (sería un fracaso aunque funcione)

- **Mostrarle marketing a alguien con sesión iniciada.**
- **Esconder precios detrás del registro.** El visitante busca y ve precios igual que un paciente; la cuenta se pide recién para reservar.
- **Inventar prueba social:** nada de "+10.000 pacientes", testimonios ni logos de prepagas. El copy vende con hechos del producto (precio con fecha, comprobante desglosado, matrícula verificada, política clara).
- **Que la publicidad se mezcle con los resultados:** el marketing va debajo del buscador, nunca entre las tarjetas.
- **Mostrar un precio engañoso según la cobertura:** si hay convenio, se dice que el paciente paga el plus en el consultorio, y no se insinúa que el total del comprobante es lo que va a pagar con su prepaga.

## Restricciones

Rigen las reglas de `CLAUDE.md`:

- Sistema visual "Consultorio porteño" y comprobante para todo precio.
- Voseo.
- Hora argentina.
- Validación del rol en el servidor.
- SQL parametrizado.
- Migraciones idempotentes en `MIGRACIONES`.

**Datos del paciente:** nombre, **DNI (cifrado a nivel columna, AES-256-GCM, `src/cifrado.ts`)**, celular, email y, si tiene, cobertura (financiador, plan y número de afiliado). Sin datos clínicos.

## Enfoques considerados

| | Enfoque | Trade-off |
|---|---|---|
| **A (elegido)** | Una sola página `/` que se arma según la sesión. El visitante ve el buscador con marketing alrededor; el paciente ve solo el buscador. | Es el mismo componente en los dos casos y el visitante está a cero clics de los precios. La página tiene dos variantes. |
| B | Landing en `/` con un buscador chico que lleva a `/buscar`. | Separa mejor el código, pero suma un clic hasta ver precios y el buscador queda "en otra página". |
| C | Bloques de marketing intercalados entre los resultados. | Original, pero mezcla publicidad con datos y erosiona la confianza. |

## Diseño

### Sesión (`src/sesion.ts`)

```ts
type Sesion =
  | { rol: "visitante" }
  | { rol: "paciente"; pacienteId: number }
  | { rol: "profesional"; profesionalId: number };
```

- **Valores de la cookie:** `visitante`, `pac:<id>` y `prof:<id>`. Sin cookie, o con un valor inválido, la sesión es **visitante**. Antes el default era paciente; ahora no.
- **`inicio(sesion)`:** visitante y paciente → `/`; profesional → `/panel/agenda`. El logo usa `inicio`.
- **Validaciones:**
  - `/panel/*` sigue siendo solo para profesionales.
  - `/mis-datos` requiere sesión (el visitante vuelve a `/`).
  - `/` redirige al profesional a su panel.

### Selector "Ver como"

```
Visitante (sin registrar)
── Pacientes ──
María Gómez · Prepaga A
Julián Ríos · Obra social C
Carla Suárez · Particular
── Profesionales ──
Dra. Lucía Fernández …
```

Solo aparecen los pacientes marcados como `usuario_demo`. Los que se crean por reservas viejas no se listan.

### Datos (agregar a `MIGRACIONES`)

**Paciente:** columnas nuevas `usuario_demo boolean DEFAULT false`, `cobertura_financiador text`, `cobertura_plan text` y `nro_afiliado text`. Los datos de demo se cargan con un `UPDATE` idempotente sobre los pacientes 1 a 3 del seed:

| Paciente | Celular | Email | Cobertura |
|---|---|---|---|
| María Gómez | +54 9 11 5555-0101 | maria.gomez@ejemplo.com | Prepaga A · plan 310 · nº 0310-55871 |
| Julián Ríos | +54 9 11 5555-0102 | julian.rios@ejemplo.com | Obra social C · plan General · nº 7731-2209 |
| Carla Suárez | +54 9 11 5555-0103 | carla.suarez@ejemplo.com | Sin cobertura (particular) |

**Combinaciones que esto genera con los profesionales del seed:**
- María (Prepaga A): con la Dra. Quiroga es **convenio con plus de $15.000**; con la Dra. Fernández, **factura para reintegro**.
- Julián (Obra social C): con la Dra. Benítez es **convenio con plus de $8.000**; con el resto, **no trabajan con su obra social**.
- Carla: no ve línea de cobertura.

**Profesional:** columnas nuevas `matricula_jurisdiccion text` y `matricula_numero text`, con valores de demo en el seed. "Verificada / En verificación" sale del `matricula_ok` que ya existe.

### Cobertura en la tarjeta

Una función pura `coberturaPara(pacienteCobertura, coberturasDelProfesional)`, con tests, devuelve uno de cuatro casos:

| Caso | Texto en la tarjeta |
|---|---|
| `convenio` | "Con tu Prepaga A: convenio, pagás un plus de $ 15.000 en el consultorio" |
| `reintegro` | "Con tu Prepaga A: te da factura para pedir reintegro" |
| `no_trabaja` | "No trabaja con Obra social C: atención particular" |
| `particular` | Sin línea (el paciente no tiene cobertura) |

Se muestra como una franja corta entre el encabezado y el comprobante, con un tono propio según el caso (verde suave si hay convenio o reintegro, neutro si no). En la reserva se repite la misma línea en el resumen.

El visitante no ve esta línea: ve el bloque de coberturas genérico de hoy.

### `/` según quién mira

- **Paciente:** el buscador de hoy (lista o mapa, filtros, tarjetas con pie de reserva), con el saludo "Hola, María" en el título.
- **Visitante:** el mismo buscador, envuelto así:

```
┌ Header: Turnos.   Buscar · Para profesionales   [Ver como ▾]  ┐
│ HERO (fondo con atmósfera)                                     │
│  Sabé cuánto sale tu consulta antes de pedir el turno.         │
│  Precios reales con fecha, coberturas y horarios libres.       │
│  [Todas][Cardiología]…                     [Lista|Mapa]        │
│  ── tarjetas del buscador (las mismas de siempre) ──           │
├ CÓMO FUNCIONA: 1 Buscá y compará · 2 Elegí horario · 3 Pagá  │
├ POR QUÉ CONFIAR: precio con fecha · comprobante desglosado ·   │
│   matrícula verificada · política de cancelación clara         │
├ PARA PROFESIONALES (banda verde botella)                       │
│   Agenda que cobra por adelantado · menos ausencias con        │
│   avisos por WhatsApp · cobrás al instante · perfil verificado │
│   [Sumate · Muy pronto] (deshabilitado)                        │
├ PREGUNTAS (details/summary): cargo de servicio · cobertura ·   │
│   cancelaciones · verificación de matrículas                   │
└ Pie                                                            ┘
```

- **Vista mapa:** el marketing no se muestra para nadie, porque el mapa ocupa la pantalla completa.
- **Movimiento:** una entrada escalonada en el hero y nada más (registro "público" de `CLAUDE.md`).
- **"Sumate":** `<button disabled>` con el texto "Sumate" y una etiqueta "Muy pronto" al lado. Abajo, en texto chico: "Estamos validando a los primeros profesionales a mano."
- **Header del visitante:** "Para profesionales" salta a esa sección del landing.

### "Mis datos" (`/mis-datos`)

- **Paciente:** formulario con nombre, celular, email, cobertura (financiador elegido de los que existen + "Sin cobertura"), plan y número de afiliado. Lo guarda una Server Action que toma al paciente de la sesión, valida que el celular tenga 8 dígitos o más y que el email tenga forma de email, y muestra "Datos guardados".
- **Profesional:** ficha de solo lectura con nombre, especialidad, matrícula (jurisdicción, número y estado), consultorios con días, y prestaciones con su precio vigente. Al pie, un aviso: "Para cambiar consultorios, horarios o precios vas a usar Ajustes (próximamente)."
- **Header:** el link "Mis datos" aparece para paciente y profesional.

### Reserva

- **Paciente:** desaparece el paso 3 "Tus datos". El resumen suma una línea "Paciente: María Gómez · +54 9 11 5555-0101" con el link "Editar en Mis datos" y la línea de cobertura. `reservar()` toma `pacienteId` de la sesión y ya no lee ni crea pacientes desde el formulario.
- **Visitante:** en `/reservar/[id]` ve **solo el próximo turno disponible** y "Necesitás una cuenta para reservar", con la nota de demo "Elegí un paciente en *Ver como*". El calendario completo no se calcula ni se envía: exponerlo sin cuenta pondría en riesgo la privacidad de la agenda del profesional. Con usuarios reales, además, se va a poder auditar quién consulta calendarios. Si intenta reservar igual, la acción lo rechaza en el servidor.
- **Profesional:** sigue redirigido a su panel.

### Docs

- Actualizar `docs/05` con `/mis-datos`, el comportamiento de `/` por rol y el visitante.
- Actualizar `CLAUDE.md` en la sesión de demo.

## Decisiones que quedan para quien implemente

- El copy exacto de cada sección, siguiendo `CLAUDE.md` → Copy y el anti-objetivo de no inventar prueba social.
- La forma del fondo "con atmósfera" del hero, dentro de los tokens existentes.
- Cómo partir `page.tsx` en componentes (buscador reutilizable + secciones del landing).

## Decisiones mías (revisalas al leer)

1. Sin cookie, el usuario es **visitante** (antes caía como paciente).
2. ~~Sin DNI~~ → **cambiado por el usuario:** se pide DNI y se guarda cifrado.
3. ~~El visitante ve el calendario~~ → **cambiado por el usuario:** el visitante solo ve el próximo turno.
4. La cobertura **se informa pero no cambia el precio** del comprobante ni el pago: reservar por cobertura es Fase 2.
5. Los profesionales **no editan** "Mis datos" por ahora (eso es Ajustes).
6. Los datos de demo se cargan por migración sobre los pacientes 1 a 3 del seed.
