# Plan de trabajo: épicas y cards

> Actualizado: 2026-11-21 · Equipo: **Agus K** (frontend) y **Agus L** (backend).
> Se revisa al cerrar cada épica. Si cambia una prioridad, se actualiza acá en el mismo cambio.

## Cómo leer este plan

- **Épica:** un bloque que termina en algo que se puede mostrar a alguien del piloto. Se hacen en orden: E0 → E6.
- **Card:** una tarea para una persona, del tamaño de un PR. Formato:
  - `ID` · **Título** · responsable · prioridad
  - *Depende de:* cards que tienen que estar antes.
  - *Listo cuando:* el criterio de aceptación.
- **Responsables:** `K` = Agus K (frontend) · `L` = Agus L (backend) · `K+L` = los dos.
- **Prioridad:** P0 = sin esto no hay piloto · P1 = lo van a pedir en la segunda semana · P2 = cierra la fase.

## Criterio de prioridad

1. **Primero lo que necesita el piloto para usarse de verdad**, es decir, la Fase 0: que las secretarias y los 4 profesionales usen nuestra agenda en lugar del papel o WhatsApp.
2. **Primero lo que mueve las métricas del piloto:** cargar un turno en menos de 15 s, ausentismo bajo 10% y cero dobles reservas.
3. **La Fase 1 queda congelada.** El buscador, la landing y la reserva con pago simulado ya sirven para mostrar la idea. No se pulen hasta cerrar la Fase 0.

## Cómo se reparte el trabajo

| | Agus K · frontend | Agus L · backend |
|---|---|---|
| Carpetas | `src/app/`: pantallas, componentes, estilos y Server Actions como capa fina | `src/modules/`, `src/db/`, jobs e integraciones externas |
| Responde por | Experiencia, velocidad de carga, estados visuales, accesibilidad, Playwright | Modelo de datos, invariantes, máquina de estados, seguridad, Vitest |
| Referencias | `CLAUDE.md` (diseño y copy), [docs/05](../docs/05-flujos-y-pantallas.md) | [backend-y-datos.md](backend-y-datos.md), [docs/03](../docs/03-modelo-de-datos.md) |

**El contrato entre los dos es la API de cada módulo** (`src/modules/<x>/index.ts`). Cada épica arranca con una card de contrato de Agus L: firmas y tipos publicados, aunque devuelvan datos del seed. Agus K construye contra eso, así ninguno espera al otro.

**Las Server Actions son finas:** validan el rol desde la sesión, llaman al módulo y traducen el resultado a la UI. Las reglas de negocio viven en el módulo.

## Resumen

| Épica | Prioridad | Tamaño | Cards K | Cards L |
|---|---|---|---|---|
| [E0 · Fundaciones](#e0--fundaciones) | P0 | S/M | 4 | 5 |
| [E1 · Agenda del día usable](#e1--agenda-del-día-usable) | P0 | M | 6 | 6 |
| [E2 · Configuración del profesional](#e2--configuración-del-profesional) | P0 | M | 5 | 6 |
| [E3 · Listo para el piloto real](#e3--listo-para-el-piloto-real) | P0 | M | 4 | 5 |
| [E4 · Recordatorios y turno por link](#e4--recordatorios-y-turno-por-link) | P0 | M/L | 4 | 6 |
| [E5 · Agenda completa](#e5--agenda-completa) | P1 | M | 5 | 5 |
| [E6 · Cierre de Fase 0](#e6--cierre-de-fase-0) | P2 | S/M | 3 | 3 |
| [EX · Tareas sin código](#ex--tareas-sin-código) | P0 | — | 1 | 3 + 1 compartida |

Tamaño, con los dos trabajando en paralelo: **S** unos días · **M** una o dos semanas · **L** más de dos semanas.

---

## E0 · Fundaciones

**Objetivo:** que todo lo que sigue se construya una sola vez y bien.
**Terminada cuando:** hay migraciones versionadas, el turno cambia solo por la máquina de estados con eventos registrados, y el panel tiene su esqueleto y sus componentes base.

**Backend**

- `E0-L1` · **Contrato de la agenda** · L · P0
  - *Listo cuando:* están publicados los tipos `Turno`, `EstadoTurno`, `EventoTurno` y las firmas de la API de agenda que usa E1.
- `E0-L2` · **Migraciones versionadas** · L · P0
  - *Listo cuando:* el esquema se aplica con migraciones de Drizzle sobre PGlite en dev, en lugar del string `MIGRACIONES`.
- `E0-L3` · **Organización y membresía** · L · P0
  - *Depende de:* E0-L2.
  - *Listo cuando:* existen `organizacion` y `membresia`, y toda tabla de negocio tiene `organizacion_id`.
- `E0-L4` · **Máquina de estados del turno** · L · P0
  - *Depende de:* E0-L2.
  - *Listo cuando:* toda transición pasa por una función de `modules/agenda` que valida el origen y escribe un `evento_turno` en la misma transacción. `expirarPendientes` ya no hace un `UPDATE` directo. Tiene tests de Vitest.
- `E0-L5` · **Seed del piloto** · L · P1
  - *Depende de:* E0-L3.
  - *Listo cuando:* los 4 profesionales tienen consultorios, horarios, prestaciones y una semana de turnos realistas.

**Frontend**

- `E0-K1` · **Componentes base tematizados** · K · P0
  - *Listo cuando:* hay botón, input, select, popover, drawer, toast y badge de estado del turno, con los tokens de `globals.css`, en claro y oscuro.
- `E0-K2` · **Esqueleto del panel** · K · P0
  - *Listo cuando:* `/panel` tiene barra lateral en desktop y barra inferior en celular (Agenda · Pacientes · Ajustes).
- `E0-K3` · **Patrones de estados** · K · P1
  - *Listo cuando:* hay componentes reutilizables para carga, vacío y error.
- `E0-K4` · **Playwright** · K · P1
  - *Listo cuando:* corre un test de humo del panel en desktop y en 375 px.

---

## E1 · Agenda del día usable

**Objetivo:** validar la métrica de 15 s. Al terminar, se le muestra a una secretaria del piloto.
**Terminada cuando:** una secretaria carga un turno con teclado en menos de 15 s, ve el día completo y el profesional marca atendido o ausente desde el celular.
**Decisiones que la destraban:** D1 (sobreturnos) y D2 (grilla fija de 15').

**Backend**

- `E1-L1` · **Turnos del día** · L · P0
  - *Depende de:* E0-L4.
  - *Listo cuando:* `turnosDelDia(profesional, fecha)` devuelve paciente, prestación, estado y confirmación, en hora de Argentina.
- `E1-L2` · **Crear turno con choque explicado** · L · P0
  - *Depende de:* E0-L4.
  - *Listo cuando:* el rechazo de la base (`23P01`) se traduce en "se pisa con X 10:15–10:45" más los 3 próximos huecos libres.
- `E1-L3` · **Buscar y crear pacientes** · L · P0
  - *Listo cuando:* `buscarPacientes` busca por nombre o teléfono, y `crearPaciente` avisa si el teléfono ya existe.
- `E1-L4` · **Transiciones del día** · L · P0
  - *Depende de:* E0-L4.
  - *Listo cuando:* se puede marcar atendido, ausente y cancelar (quién cancela: paciente o profesional), con la política aplicada y testeada.
- `E1-L5` · **Deshacer creación** · L · P1
  - *Depende de:* E1-L2.
  - *Listo cuando:* un turno recién creado se puede deshacer dentro de 5 s y queda registrado como evento.
- `E1-L6` · **Sobreturnos** · L · P1
  - *Depende de:* decisión D1.
  - *Listo cuando:* si D1 es sí, `es_sobreturno` queda fuera de la restricción anti doble reserva y solo se crea desde el panel.

**Frontend**

- `E1-K1` · **Agenda día en desktop** · K · P0
  - *Depende de:* E0-K1, E0-K2, E0-L1.
  - *Listo cuando:* la grilla de 15' muestra cada turno con los estados visuales de [docs/05](../docs/05-flujos-y-pantallas.md#lenguaje-visual-de-estados-del-turno), incluidos día vacío, día sin horarios y día pasado.
- `E1-K2` · **Popover de carga rápida** · K · P0
  - *Depende de:* E1-K1, E1-L2, E1-L3.
  - *Listo cuando:* se abre con click en un hueco o con la tecla N, tiene typeahead de paciente con alta inline y guarda con Enter. Carga un paciente existente en menos de 15 s.
- `E1-K3` · **Choque dentro del popover** · K · P0
  - *Depende de:* E1-K2.
  - *Listo cuando:* el popover no se cierra, muestra con quién se pisa y ofrece los próximos huecos como botones.
- `E1-K4` · **Agenda día en celular** · K · P0
  - *Depende de:* E1-K1, E1-L4.
  - *Listo cuando:* muestra "Ahora" y "Sigue", y al tocar un turno se abre una hoja inferior con Atendido · Ausente · Mover · Cancelar · Llamar.
- `E1-K5` · **Detalle del turno y deshacer** · K · P1
  - *Depende de:* E1-L5.
  - *Listo cuando:* el drawer muestra el turno con su historial de eventos, y al crear aparece un toast con "Deshacer".
- `E1-K6` · **Playwright de la agenda** · K · P1
  - *Depende de:* E0-K4, E1-K3.
  - *Listo cuando:* hay tests de cargar turno, choque y marcar atendido.

---

## E2 · Configuración del profesional

**Objetivo:** que cada profesional cargue lo suyo sin que lo hagamos nosotros a mano.
**Terminada cuando:** un profesional configura consultorios, horarios, excepciones y prestaciones con precio, y la agenda y los huecos lo reflejan.
**Decisiones que la destraban:** D4 (buffer por prestación) y D6 (dos consultorios el mismo día).

**Backend**

- `E2-L1` · **Contrato de ajustes** · L · P0
  - *Listo cuando:* están publicadas las firmas de consultorios, horarios, excepciones y prestaciones.
- `E2-L2` · **Disponibilidad con excepciones** · L · P0
  - *Listo cuando:* existen `atencion`, `regla_disponibilidad` con vigencia y `excepcion_disponibilidad`, migrados desde la tabla `disponibilidad` del prototipo.
- `E2-L3` · **Cálculo de huecos completo** · L · P0
  - *Depende de:* E2-L2.
  - *Listo cuando:* `calcularGrilla` descuenta excepciones y buffer por prestación, con tests.
- `E2-L4` · **Precio con historial** · L · P0
  - *Listo cuando:* cambiar un monto crea un `precio` nuevo y confirmarlo sin cambios crea una `confirmacion_precio`.
- `E2-L5` · **Direcciones con Georef/USIG** · L · P1
  - *Listo cuando:* una dirección se normaliza y se guarda con su ubicación.
- `E2-L6` · **Validaciones de horarios y bloqueos** · L · P0
  - *Depende de:* E2-L2.
  - *Listo cuando:* se rechazan franjas superpuestas entre consultorios (D6), y un bloqueo con turnos adentro devuelve la lista de afectados antes de guardar.

**Frontend**

- `E2-K1` · **Ajustes de consultorios** · K · P0
  - *Depende de:* E2-L1.
  - *Listo cuando:* se agrega y edita un consultorio con autocompletado de dirección y precisión del pin.
- `E2-K2` · **Editor de horarios** · K · P0
  - *Depende de:* E2-L1.
  - *Listo cuando:* hay grilla semanal por consultorio con presets ("Lun a Vie 9–13").
- `E2-K3` · **Ajustes de prestaciones y precios** · K · P0
  - *Depende de:* E2-L4.
  - *Listo cuando:* se editan duración, buffer y precio, y se ve "actualizado hace N días".
- `E2-K4` · **Bloqueos y vacaciones** · K · P0
  - *Depende de:* E2-L6.
  - *Listo cuando:* al bloquear un rango con turnos adentro, se listan y se ofrece *Cancelar todos y avisar* o *Reprogramar uno por uno*.
- `E2-K5` · **Ajustes de política de cancelación** · K · P1
  - *Listo cuando:* el profesional elige una plantilla y ve cómo se le explica al paciente.

Los formularios de esta épica se diseñan para reusarse en el onboarding (E5-K4).

---

## E3 · Listo para el piloto real

**Objetivo:** pasar de la demo con "Ver como" a usuarios reales con datos reales.
**Terminada cuando:** los profesionales y secretarias del piloto entran con su cuenta, en un entorno publicado, y nadie ve datos de otra organización.
**Decisión que la destraba:** D5 (login).

**Backend**

- `E3-L1` · **Login real** · L · P0
  - *Depende de:* E0-L3.
  - *Listo cuando:* Better Auth funciona con magic link y Google, con roles por organización.
- `E3-L2` · **Invitación de secretaria** · L · P0
  - *Depende de:* E3-L1.
  - *Listo cuando:* `/invitacion/[token]` da de alta a la secretaria con permisos sobre uno o varios profesionales.
- `E3-L3` · **Aislamiento por organización** · L · P0
  - *Depende de:* E3-L1.
  - *Listo cuando:* hay Row Level Security en Postgres y cada acción valida la organización desde la sesión. Un test confirma que una organización no lee datos de otra.
- `E3-L4` · **Deploy** · L · P0
  - *Depende de:* EX-L2.
  - *Listo cuando:* corre en Vercel (gru1) con Postgres gestionado (sa-east-1), backups y Sentry.
- `E3-L5` · **Auditoría** · L · P1
  - *Listo cuando:* queda registrado en forma append-only quién accede a pacientes y quién cambia turnos.

**Frontend**

- `E3-K1` · **Pantalla de ingreso** · K · P0
  - *Depende de:* E3-L1.
  - *Listo cuando:* `/ingresar` maneja el envío del magic link, el link vencido y el ingreso con Google.
- `E3-K2` · **Equipo e invitaciones** · K · P0
  - *Depende de:* E3-L2.
  - *Listo cuando:* el profesional invita a su secretaria, y la secretaria con varios profesionales tiene un selector arriba.
- `E3-K3` · **Sesión real en la UI** · K · P0
  - *Depende de:* E3-L1.
  - *Listo cuando:* el selector "Ver como" queda solo en desarrollo.
- `E3-K4` · **Revisión de accesibilidad del panel** · K · P1
  - *Listo cuando:* el panel se opera entero con teclado, con foco visible y contraste AA.

---

## E4 · Recordatorios y turno por link

**Objetivo:** bajar el ausentismo, la métrica que más le importa al profesional.
**Terminada cuando:** el paciente recibe el aviso por WhatsApp a las 48 h y 24 h, confirma o cancela desde `/t/[token]`, y la agenda lo refleja al instante.

**Backend**

- `E4-L1` · **Token del paciente** · L · P0
  - *Listo cuando:* `turno_token` se guarda como hash, vence cuando pasa el turno y reemplaza a `turno.token`.
- `E4-L2` · **Avisos programados** · L · P0
  - *Listo cuando:* Inngest manda avisos a T-48 h y T-24 h y relee el estado del turno antes de enviar.
- `E4-L3` · **WhatsApp y email** · L · P0
  - *Depende de:* EX-L1, E4-L2.
  - *Listo cuando:* sale la plantilla aprobada de WhatsApp con un único link a `/t/[token]`, y si no hay WhatsApp, un email con `.ics` (Resend).
- `E4-L4` · **Registro de notificaciones** · L · P1
  - *Listo cuando:* `notificacion` guarda envío, entrega y lectura de cada aviso.
- `E4-L5` · **Web push al panel** · L · P1
  - *Listo cuando:* una cancelación o un turno nuevo le llega al panel como notificación.
- `E4-L6` · **Respuesta automática fija** · L · P1
  - *Depende de:* E4-L3.
  - *Listo cuando:* si el paciente escribe al número, recibe el mensaje fijo con el link y el teléfono del consultorio.

**Frontend**

- `E4-K1` · **Página del turno del paciente** · K · P0
  - *Depende de:* E4-L1.
  - *Listo cuando:* `/t/[token]` permite confirmar, cancelar y reprogramar en una columna, mobile first, mostrando la política aplicada a ese turno.
- `E4-K2` · **Estados de la página del turno** · K · P0
  - *Depende de:* E4-K1.
  - *Listo cuando:* están diseñados los casos ya cancelado, vencido, fuera de la ventana gratis y sin huecos para reprogramar.
- `E4-K3` · **Confirmación en la agenda** · K · P0
  - *Listo cuando:* cada turno muestra ✓ Confirmó · … Sin respuesta · — No se envió, y hay una lista "Sin respuesta para mañana" con el teléfono para llamar.
- `E4-K4` · **Notificaciones del panel** · K · P1
  - *Depende de:* E4-L5.
  - *Listo cuando:* el panel pide permiso para notificaciones y las muestra.

---

## E5 · Agenda completa

**Objetivo:** lo que la secretaria va a pedir en la segunda semana de uso.
**Decisión que la destraba:** D3 (tratamientos de varias sesiones).

**Backend**

- `E5-L1` · **Mover turno** · L · P1
  - *Listo cuando:* mover cancela el original y crea uno nuevo enlazado con `turno_origen_id`.
- `E5-L2` · **Turnos repetidos** · L · P1
  - *Listo cuando:* "Repetir" crea una serie con `serie_id` y devuelve los conflictos antes de confirmar.
- `E5-L3` · **Pacientes con historial** · L · P1
  - *Listo cuando:* hay listado con búsqueda y ficha con historial de turnos, sin datos clínicos.
- `E5-L4` · **Verificación de matrícula** · L · P1
  - *Depende de:* EX-L3.
  - *Listo cuando:* se consulta REFEPS/SISA y lo que no se resuelve va a una cola manual.
- `E5-L5` · **Contrato del onboarding** · L · P1
  - *Listo cuando:* el alta guarda al avanzar cada paso y se retoma donde quedó.

**Frontend**

- `E5-K1` · **Vista semana** · K · P1
  - *Depende de:* E5-L1.
  - *Listo cuando:* se ve la semana con columnas por profesional y se mueve un turno arrastrándolo.
- `E5-K2` · **Repetir en el popover** · K · P1
  - *Depende de:* E5-L2.
  - *Listo cuando:* se elige semanal × N sesiones y se ven los conflictos antes de guardar.
- `E5-K3` · **Pacientes** · K · P1
  - *Depende de:* E5-L3.
  - *Listo cuando:* hay lista con búsqueda y ficha del paciente.
- `E5-K4` · **Onboarding** · K · P1
  - *Depende de:* E2-K1, E2-K2, E2-K3, E5-L5.
  - *Listo cuando:* `/alta` encadena los formularios de ajustes y cualquier paso se puede saltear.
- `E5-K5` · **Estado de matrícula** · K · P1
  - *Depende de:* E5-L4.
  - *Listo cuando:* el panel muestra En verificación, Verificada o Rechazada con su motivo.

---

## E6 · Cierre de Fase 0

**Backend**

- `E6-L1` · **Revisión de precios** · L · P2
  - *Listo cuando:* un job avisa al profesional que tiene precios viejos, con un link de un toque.
- `E6-L2` · **Métricas del piloto** · L · P2
  - *Listo cuando:* se calculan ausentismo, frescura de precios y tiempos de carga.
- `E6-L3` · **Marcar en lote** · L · P2
  - *Listo cuando:* los turnos pasados sin marcar se pueden pasar a atendido de una vez.

**Frontend**

- `E6-K1` · **Revisar precios en un toque** · K · P2
  - *Depende de:* E6-L1.
  - *Listo cuando:* `/panel/precios/revisar` confirma todo o permite editar los montos.
- `E6-K2` · **Turnos sin marcar** · K · P2
  - *Depende de:* E6-L3.
  - *Listo cuando:* al final del día aparece "Tenés 4 turnos sin marcar" con la acción para marcarlos.
- `E6-K3` · **Admin de verificaciones** · K · P2
  - *Depende de:* E5-L4.
  - *Listo cuando:* `/admin/verificaciones` muestra la cola de matrículas pendientes.

---

## EX · Tareas sin código

Tienen tiempos de espera externos: hay que arrancarlas ya, en paralelo con E0.

- `EX-L1` · **WhatsApp Business** · L · P0
  - *La necesita:* E4-L3.
  - *Listo cuando:* la cuenta está verificada en Meta y las plantillas de recordatorio están aprobadas.
- `EX-L2` · **Cuentas de infraestructura** · L · P0
  - *La necesita:* E3-L4.
  - *Listo cuando:* hay cuenta de Vercel y está elegido y creado el Postgres gestionado (Neon o Supabase).
- `EX-L3` · **Acceso a REFEPS/SISA** · L · P1
  - *La necesita:* E5-L4.
  - *Listo cuando:* se sabe cómo consultar matrículas y con qué condiciones.
- `EX-KL1` · **Revisión legal** · K+L · P0
  - *La necesita:* E3.
  - *Listo cuando:* un abogado revisó datos sensibles, transferencia internacional y publicidad de tarifas ([docs/04](../docs/04-legal-y-riesgos.md)).
- `EX-K1` · **Prueba con una secretaria del piloto** · K · P0
  - *Depende de:* E1.
  - *Listo cuando:* una secretaria cargó turnos reales en la agenda y se midió el tiempo de carga.

---

## Decisiones de producto que destraban épicas

Se cierran en la conversación de producto y se registran en [decisiones/](decisiones/):

| Decisión | Antes de |
|---|---|
| D1 · Sobreturnos (afecta la restricción anti doble reserva) | E1 |
| D2 · Grilla fija de 15' o por duración | E1 |
| D4 · Buffer por prestación | E2 |
| D6 · Mismo profesional en dos consultorios el mismo día | E2 |
| D5 · Login con magic link + Google | E3 |
| D3 · Tratamientos de varias sesiones | E5 |

## Después: Fase 1

Recién con la Fase 0 andando en el piloto:
- Mercado Pago marketplace real con webhook.
- Búsqueda con PostGIS.
- Perfil público `/p/[slug]`.
- Retomar la reserva y el buscador del prototipo.

Se arma como épicas al cerrar E6.

## Forma de trabajar entre los dos

- **Una rama por card y PR chico**, con el ID de la card en el título (`E1-K2 Popover de carga rápida`), revisado por el otro.
- **Los cambios de contrato** (firmas de módulos, tipos compartidos) se avisan antes y se mergean primero.
- **Cada PR visible** incluye captura en desktop y en 375 px; **cada PR de dominio** incluye sus tests.
- **Al cerrar una épica:** demo de 15 minutos, actualizar la tabla "Del prototipo a producción" de [backend-y-datos.md](backend-y-datos.md) y revisar este plan.
