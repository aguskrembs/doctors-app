# Flujos y pantallas

> Estado: borrador v0.1 · 2026-11-15 · Foco: **Fase 0** (agenda), con la Fase 1 esbozada para no cerrarle puertas.

## Principios de diseño

1. **La agenda es el producto.** La pantalla donde vive la secretaria es la primera que se diseña y la que más se pule. Todo lo demás (configuración, onboarding) existe para alimentarla.
2. **Dos dispositivos, dos ritmos.**
   - Secretaria → **desktop**, densa, con teclado: carga turnos mientras habla por teléfono.
   - Profesional → **celular**, entre paciente y paciente: "¿quién sigue?", marcar atendido.
3. **Nunca bloquear el uso por la configuración.** La matrícula se verifica en segundo plano, los horarios tienen presets, cada paso del onboarding se puede saltear. Lo que no esté verificado bloquea *publicar*, no *usar la agenda*.
4. **El paciente no necesita cuenta en Fase 0.** Recibe avisos por WhatsApp (o email) con un link con token (`/t/[token]`) y ahí hace todo.
5. **Consistencia de estados.** Un turno se ve igual (color, ícono, texto) en la agenda, en el detalle, en el listado del paciente y en los mensajes.
6. **Plata siempre desglosada** (Fase 1): `precio del profesional + cargo de servicio = total`.
7. **Hora siempre de Argentina**, aunque el navegador esté en otra zona.
8. **WhatsApp avisa, la app resuelve.** WhatsApp es el canal principal de aviso (email como alternativa, web push para el panel), pero nunca se interactúa con la app desde ahí: sin botones de respuesta ni texto para interpretar. Cada mensaje lleva un único link a la pantalla correcta.

## Superficies y mapa de rutas

```
PÚBLICO
/                          Visitante: landing con el buscador adentro · Paciente: solo el buscador
                           (?vista=lista|mapa&esp=…; en mapa no hay marketing para nadie)
/p/[slug]                  Perfil público (F1)
/reservar/[profesional]    Paciente: calendario semanal + resumen y pago · Visitante: solo el próximo turno
/reservar/pago/[token]     Pago (simulado en el prototipo); solo para el paciente dueño del turno
/reservar/confirmado/[token]
/mis-datos                 Paciente: datos personales, DNI (cifrado) y cobertura, editables
                           Profesional: ficha de solo lectura (matrícula, consultorios, prestaciones)
/t/[token]                 Gestión de turno del paciente: confirmar / cancelar / reprogramar (F0)

AUTENTICACIÓN
/ingresar                  Login (magic link por email o Google)
/alta                      Onboarding del profesional (wizard)
/invitacion/[token]        Alta de secretaria invitada

PANEL (profesional y secretaria)
/panel                     → /panel/agenda
/panel/agenda              ?fecha=2026-11-17&vista=dia|semana&prof=<id>
/panel/agenda/turno/[id]   Detalle del turno (drawer sobre la agenda, intercepting route)
/panel/pacientes           Listado + búsqueda
/panel/pacientes/[id]      Ficha: contacto + historial de turnos (sin datos clínicos)
/panel/ajustes/consultorios
/panel/ajustes/horarios    Disponibilidad semanal + excepciones
/panel/ajustes/prestaciones  Prestaciones, duración y precio
/panel/ajustes/politica    Plantilla de cancelación
/panel/ajustes/coberturas  (F1)
/panel/ajustes/equipo      Invitar secretaria, permisos
/panel/ajustes/cobros      Vincular Mercado Pago (F1)
/panel/precios/revisar     Revisión de precios en un toque (llega por link)

ADMIN (nosotros)
/admin/verificaciones      Cola de matrículas pendientes
```

Navegación del panel: barra lateral en desktop (Agenda · Pacientes · Ajustes) y barra inferior en celular. Si la secretaria trabaja para varios profesionales, arriba hay un selector de profesional (o "Todos" en vista de columnas).

## Quién ve qué (usuarios y sesión)

| Usuario | `/` | Reserva | Mis datos |
|---|---|---|---|
| Visitante (sin cuenta) | Landing: hero, buscador, cómo funciona, banda para profesionales ("Sumate", deshabilitado hasta tener el alta validada por nuestro equipo), preguntas | Ve **solo el próximo turno disponible** y se le pide cuenta. El calendario completo no se calcula para él, para cuidar la agenda del profesional | No |
| Paciente | Solo el buscador, sin marketing, con la franja de su cobertura en cada tarjeta | Calendario semanal; no se le piden datos: salen de su cuenta | Sí, editable |
| Profesional | Va a `/panel/agenda` | No reserva | Sí, solo lectura |

- **El logo lleva al inicio de cada uno.**
- **Auditoría (pendiente):** con usuarios reales, registrar quién consulta calendarios para detectar a alguien que quiera reconstruir la agenda de un profesional. Es una de las razones por las que el calendario completo exige cuenta.

## Flujos

### F1 · Onboarding del profesional
**Objetivo:** agenda usable en menos de 10 minutos.

```
/ingresar ─► /alta
  1. Datos y matrícula ── nombre, especialidad, jurisdicción + número
                          → dispara verificación REFEPS en segundo plano (no espera)
  2. Consultorio ──────── dirección con autocompletado (Georef/USIG), nombre opcional,
                          precisión pública del pin. "Agregar otro" opcional.
  3. Horarios ─────────── grilla semanal por consultorio. Presets: "Lun a Vie 9–13",
                          "Lun/Mié/Vie tarde". Se edita arrastrando.
  4. Prestaciones ─────── precargadas según la especialidad
                          (odonto: Consulta 30', Limpieza 45'; kinesio: Sesión 45'...).
                          Se ajusta duración y precio.
  5. Equipo (opcional) ── invitar secretaria por WhatsApp o email (link de invitación)
  └─► /panel/agenda  con un banner de "Completá tu perfil" si quedó algo pendiente
```

Detalles:
- Cada paso guarda al avanzar; si cierra la pestaña, retoma donde quedó.
- Los formularios del wizard son **los mismos componentes** que `/panel/ajustes/*`. El wizard solo los encadena.
- Estado de matrícula visible siempre en el panel: *En verificación* → *Verificada* / *Rechazada (motivo)*.

### F2 · Carga rápida de turno (secretaria) — la métrica de < 15 s

```
Click en hueco libre de la agenda  (o tecla N / botón "+ Turno")
  └─► Popover anclado al horario:
        Paciente   [typeahead por nombre o teléfono          ]
                   ↳ sin resultados: "+ Crear 'María G.'" → aparece el celular (WhatsApp) inline; email opcional como alternativa
        Prestación [la más usada por este profesional ▾] (autocompleta duración)
        Horario    [mar 17/11 · 10:30 – 11:00]  (viene del hueco clickeado)
        Consultorio  implícito según la disponibilidad de ese día; selector solo si hay ambigüedad
        Nota       (opcional, no clínica)
        [Enter] Guardar      [✓] Avisar al paciente por WhatsApp
```

- Presupuesto: click (1 s) + tres letras y Enter (3 s) + Enter (1 s) ≈ **5 s** para un paciente existente.
- **Choque de horario:** la base lo rechaza (`23P01`). El popover no se cierra: muestra "Ese horario se pisa con *Juan P. 10:15–10:45*" y ofrece los **3 próximos huecos libres** como botones.
- **Fuera del horario de atención:** se permite con aviso ("Fuera de tu horario habitual"). Ver decisión D1 sobre sobreturnos.
- **Turnos repetidos** (kinesio): checkbox "Repetir" → semanal × N sesiones. Se muestran los conflictos antes de confirmar. Ver D3.
- Al guardar: el turno aparece en la agenda con un highlight breve y un toast con "Deshacer" (5 s).

### F3 · El día del profesional (celular)

```
/panel/agenda (vista día, mobile)
  ┌────────────────────────────────────┐
  │ Martes 17 · Palermo         ‹  ›   │
  │ AHORA   10:30  María G. · Consulta │  ← tarjeta destacada
  │ SIGUE   11:00  Juan P.  · Limpieza │
  │ ─────────────────────────────────  │
  │ 09:00 ✓ Ana R.      Atendido       │
  │ 09:30 ✗ Pedro S.    Ausente        │
  │ 11:30   (libre)                    │
  └────────────────────────────────────┘
```

- Tocar un turno → hoja inferior con acciones grandes: **Atendido · Ausente · Mover · Cancelar · Llamar al paciente**.
- Al final del día, si quedan turnos pasados sin marcar: "Tenés 4 turnos sin marcar → Marcar todos como atendidos". Así el dato de ausentismo (métrica clave) queda limpio sin esfuerzo.

### F4 · Ciclo de vida + recordatorios

```
Turno CONFIRMADO (cargado en el panel)
  ├─ T-48 h ─► WhatsApp: "Tenés turno el mar 17 a las 10:30 con Dra. X en Palermo"
  │            (email con .ics si no tiene WhatsApp)
  │            un solo botón de link: [Ver mi turno] ─► /t/[token]
  │              ┌─────────────────────────────────┐
  │              │ Dra. X · Consulta               │
  │              │ Martes 17/11 · 10:30            │
  │              │ Av. Santa Fe 3200, Palermo      │
  │              │ [   Voy a ir   ]                │
  │              │ Reprogramar  ·  Cancelar        │
  │              │ Cancelás gratis hasta lun 10:30 │
  │              └─────────────────────────────────┘
  │     ├─ Voy a ir ──► confirmacion_paciente = CONFIRMADA   (badge ✓ en la agenda)
  │     ├─ Cancelar ──► estado = CANCELADO_PACIENTE (se registra si fue tarde según la política)
  │     │               └─► aviso al panel: "Se liberó mar 10:30"
  │     └─ Reprogramar ► link /t/[token] con huecos disponibles → turno nuevo
  │                      (cancela el original y lo enlaza con turno_origen_id)
  ├─ T-24 h ─► si sigue sin respuesta, segundo aviso
  │            └─► en el panel: lista "Sin respuesta para mañana" con su teléfono para llamar
  └─ Hora del turno ─► el profesional marca ATENDIDO / AUSENTE (F3)
```

- **Confirmación del paciente ≠ estado del turno.** El turno sigue CONFIRMADO (reservado); lo que cambia es si el paciente *confirmó asistencia*. En la agenda: `✓ Confirmó` / `… Sin respuesta` / `— No se envió`. La secretaria llama solo a los "sin respuesta" del día siguiente.
- `/t/[token]` es **la** interfaz del paciente en Fase 0: sin login, una sola columna, botones grandes, carga instantánea en el celular. Muestra la política de cancelación aplicada a *ese* turno ("gratis hasta lun 10:30"). El token es de un solo turno y vence cuando el turno pasa.
- **No interpretamos respuestas.** Si el paciente le escribe al número, recibe un mensaje automático fijo: "Este número solo envía avisos. Gestioná tu turno acá: link · Consultorio: teléfono".
- Reprogramar se hace en la misma página: grilla de huecos libres de las próximas 2 semanas, un toque para elegir y otro para confirmar.
- La cancelación o reprogramación del paciente le llega al panel por web push y aparece al instante en la agenda.

### F5 · Mover, cancelar y bloquear (panel)

- **Mover:**
  - Desktop: arrastrar en la vista semana.
  - Celular: "Mover" → elegir hueco.
  - Siempre ofrece "Avisar al paciente por WhatsApp" (tildado por defecto), con link a `/t/[token]` actualizado.
- **Cancelar:** pregunta *quién cancela* (paciente / profesional), porque cambia el estado, la política y, en F1, el reintegro.
- **Bloquear horario o vacaciones** (excepción): si hay turnos dentro del rango, se listan antes de guardar con dos opciones: *Cancelar todos y avisar* o *Reprogramar uno por uno*. Nunca quedan turnos huérfanos dentro de un bloqueo.

### F6 · Revisión de precios

```
Job semanal/mensual ─► WhatsApp (o web push) al profesional, con botón de link:
  "Tus precios tienen 32 días. ¿Siguen vigentes?"  [Sí, siguen] [Actualizar]
     ├─ Sí ─────────► /panel/precios/revisar?token=… confirma todo en un toque
     └─ Actualizar ─► misma pantalla con los montos editables
```

### F7 · Reserva online del paciente (Fase 1, esbozo)

```
/  buscar especialidad + zona ─► lista/mapa con precio y "actualizado hace N días"
  └─► /p/[slug] perfil: prestaciones, consultorios, coberturas, política
        └─► elegir prestación ─► elegir hueco (calendario de slots calculados)
              └─► datos: nombre + WhatsApp (código de verificación) y email opcional
                    └─► resumen: precio + cargo = total · política de cancelación
                          └─► Mercado Pago (hold de 15 min con cuenta regresiva)
                                ├─ aprobado ─► "Turno confirmado" + WhatsApp con link a /t/[token]
                                ├─ pendiente ─► "Estamos esperando la confirmación del pago"
                                └─ rechazado/vencido ─► "Se liberó el horario" + reintentar
```

## Inventario de pantallas (Fase 0)

| Pantalla | Usuario | Prioridad | Estados a diseñar |
|---|---|---|---|
| Agenda · día | Secretaria, profesional | P0 | vacía, sin horarios configurados, día bloqueado, día pasado |
| Popover de carga rápida | Secretaria | P0 | paciente nuevo, choque, fuera de horario, repetir |
| Detalle de turno (drawer) | Ambos | P0 | cada estado del turno, con historial de eventos |
| Agenda · semana | Secretaria | P1 | multi-consultorio, arrastrar |
| Pacientes (lista + ficha) | Secretaria | P1 | vacía, duplicado por teléfono |
| Ajustes: consultorios, horarios, prestaciones | Profesional | P0 | — |
| Onboarding `/alta` | Profesional | P1 | retomar, matrícula rechazada |
| `/t/[token]` | Paciente | P0 | ya cancelado, vencido, fuera de la ventana gratis, sin huecos para reprogramar |
| Revisión de precios | Profesional | P2 | — |
| Equipo / invitación | Profesional, secretaria | P2 | invitación vencida |
| Admin verificaciones | Nosotros | P2 | — |

## Lenguaje visual de estados del turno

| Estado / sub-estado | Texto en la UI | Tratamiento |
|---|---|---|
| PENDIENTE_PAGO (F1) | Esperando pago · 12 min | amarillo, rayado, cuenta regresiva |
| CONFIRMADO + sin canal de aviso | Reservado · sin recordatorio | azul contorno, ícono de aviso tachado |
| CONFIRMADO + sin respuesta | Reservado | azul contorno |
| CONFIRMADO + confirmó | ✓ Confirmó | azul lleno |
| ATENDIDO | Atendido | gris/verde apagado |
| AUSENTE | Ausente | rojo |
| CANCELADO_* | Canceló paciente / profesional | oculto por defecto; toggle "Mostrar cancelados" |
| EXPIRADO (F1) | No se pagó | oculto por defecto |
| Sobreturno (si D1 = sí) | Sobreturno | ícono `+` y borde punteado |

## Impacto en el modelo de datos

Los flujos de arriba piden algunos cambios a `03-modelo-de-datos.md`:

- `turno.confirmacion_paciente`: `NO_ENVIADO | PENDIENTE | CONFIRMADA`, separado de `estado`.
- `suscripcion_push`: `(usuario_id, endpoint, claves)` para web push del panel.
- `notificacion`: registro de cada aviso (canal WHATSAPP/EMAIL/PUSH, plantilla, turno, enviado_en, entregado_en, leido_en) para medir lectura vs. ausentismo.
- `turno.turno_origen_id`: ya previsto para reprogramaciones.
- `turno.serie_id`: agrupa turnos repetidos (F2, D3).
- `turno.nota`: texto corto, operativo, **no clínico**.
- `turno_token`: `(token_hash, turno_id, expira_en)` para `/t/[token]`.
- `turno.es_sobreturno`: solo si D1 = sí (ver abajo).
- `prestacion.buffer_min`: tiempo de limpieza o preparación entre turnos (D4).

## Decisiones abiertas

| # | Pregunta | Recomendación |
|---|---|---|
| D1 | **¿Sobreturnos?** En Argentina son muy comunes, pero la restricción `EXCLUDE` los prohíbe. | Permitirlos como flag explícito `es_sobreturno` que queda **fuera** de la restricción, solo desde el panel y nunca online. La garantía anti doble reserva se mantiene para los turnos normales. |
| D2 | ¿Grilla de la agenda fija (cada 15') o por duración de la prestación? | Visualizar en grilla de 15'. Los huecos *ofrecidos* (online y en "próximos libres") se calculan por duración + buffer. |
| D3 | Tratamientos de varias sesiones (kinesio, odonto) | F0: "Repetir" con `serie_id`, sin entidad Tratamiento. Paquetes y pagos por tratamiento recién en F1, cuando haya cobro. |
| D4 | ¿Buffer por prestación o por profesional? | Por prestación (`buffer_min`, default 0). Odonto lo va a usar; cardio probablemente no. |
| D5 | Login | Magic link + Google con Better Auth. Sin contraseñas. |
| D6 | Mismo profesional en dos consultorios el mismo día | Validar al cargar horarios que no se superpongan franjas entre consultorios. Tiempo de traslado: no en F0. |

## Orden sugerido para codear (cortes verticales)

1. **Fundaciones:** Tailwind + shadcn/ui, Drizzle con migraciones (sobre PGlite en dev), estructura `modules/`, Better Auth con organización y roles, seed realista para los 4 profesionales del piloto.
2. **Agenda · día (solo lectura) + drawer de turno** con los datos del seed. Máquina de estados del turno en `modules/agenda` con tests de Vitest.
3. **Carga rápida + búsqueda de pacientes** (F2), con manejo de `23P01` y "próximos huecos".
4. **Ajustes: consultorios, horarios, prestaciones y precios**, más el cálculo de slots como función pura y testeada (disponibilidad − excepciones − turnos − buffer).
5. **Vista semana + mover/cancelar + bloqueos** (F5).
6. **Onboarding `/alta`** (F1), reusando los formularios de ajustes.
7. **`/t/[token]` + avisos por WhatsApp** (email como alternativa, web push para el panel) (F4) con Inngest.
8. **Revisión de precios** (F6).

> ¿Por qué este orden? La agenda se construye primero con datos de seed, porque es la pantalla que valida la métrica de 15 s y se puede mostrar a la secretaria del piloto desde la segunda semana. La configuración y el onboarding llegan después y reusan esos componentes.

## Qué pasa con el prototipo actual

- `src/app/page.tsx` es un esbozo del **buscador de la F1** (precios con frescura, coberturas). Sirve de referencia para `/` y `/p/[slug]`.
- `src/app/agenda/page.tsx` demuestra la restricción anti doble reserva. Es el punto de partida del paso 2, y pasa a `/panel/agenda`.
