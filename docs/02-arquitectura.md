# Arquitectura inicial

> Estado: borrador v0.1 · 2026-11-14

## Restricciones

- **Equipo:** 2 ingenieros, con experiencia en AWS.
- **Plataforma:** liviana y moderna (tipo Vercel), con poca configuración que mantener.
- **Datos:** de salud, sensibles según la Ley 25.326. Importan la región, el cifrado y la auditoría.
- **Resiliencia:** cero dobles reservas y pagos siempre conciliados.
- **Futuro:** clínicas y hospitales. El modelo debe ser multi-organización desde el día 1.

## Forma: monolito modular

Una sola app de Next.js con un solo deploy, organizada en módulos con fronteras explícitas. Cada módulo expone una API interna (`modules/<x>/index.ts`) y ningún módulo importa las tablas de otro.

```
src/
  app/                    # rutas Next.js (UI + route handlers)
    (publico)/            # mapa, perfil, reserva
    (panel)/              # agenda del profesional / secretario
    api/webhooks/         # mercadopago, whatsapp
  modules/
    identidad/            # usuarios, organizaciones, membresías, roles
    profesionales/        # perfil, matrícula, verificación, especialidades
    consultorios/         # ubicaciones, geocoding, precisión del pin
    catalogo/             # prestaciones, precios con vigencia, coberturas aceptadas
    agenda/               # disponibilidad, excepciones, cálculo de slots, turnos
    pagos/                # Mercado Pago, comisiones, reintegros, conciliación
    notificaciones/       # WhatsApp, email, recordatorios programados
    busqueda/             # consultas geoespaciales y filtros
  lib/                    # db, auth, logger, errores, tiempo (TZ AR)
```

Si un módulo necesita escalar por separado (por ejemplo, búsqueda o notificaciones), se extrae porque la frontera ya existe.

## Stack propuesto

| Capa | Elección | Por qué |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** en **Vercel** | Un deploy, previews por PR, cero infraestructura |
| UI | Tailwind + shadcn/ui | Look & feel prolijo rápido, componentes accesibles y propios |
| DB | **Postgres gestionado con PostGIS**: Neon o Supabase, región `sa-east-1` (São Paulo) | Búsqueda geográfica nativa; restricciones de exclusión anti doble reserva |
| ORM | **Drizzle** | Tipado; deja escribir SQL crudo para PostGIS y `EXCLUDE` (Prisma no lo soporta bien) |
| Auth | Better Auth (en nuestra DB) | Los datos de identidad quedan con nosotros; soporta organizaciones y roles |
| Jobs / programados | **Inngest** (o Trigger.dev) | Recordatorios, expiración de reservas pendientes, conciliación; reintentos e idempotencia sin colas propias |
| Pagos | **Mercado Pago Checkout Pro**, modo marketplace (OAuth del profesional + `marketplace_fee`) | La plata va directo a la cuenta del profesional; nosotros cobramos la comisión. **No custodiamos fondos** |
| WhatsApp | Meta WhatsApp Cloud API (plantillas aprobadas) | Canal que el paciente ya usa |
| Mapas | MapLibre GL + tiles de MapTiler | Más barato y sin lock-in de Google |
| Geocoding | **Georef API** (datos.gob.ar) + USIG para CABA | Normalización oficial de direcciones argentinas |
| Archivos | Vercel Blob o S3 | Fotos de matrícula, cifradas y con acceso firmado |
| Observabilidad | Sentry + logs estructurados; Better Stack para uptime | Mínima configuración |
| Testing | Vitest (dominio), Playwright (flujos críticos) | La agenda y los pagos se testean a fondo |

> **Sobre la región:** Vercel ejecuta las funciones donde le indiquemos. Hay que fijar `gru1` (São Paulo) para estar cerca de la DB. Brasil y EE.UU. no figuran en la lista de países "adecuados" de la AAIP, así que la transferencia internacional de datos de salud requiere cláusulas contractuales y/o consentimiento. Ver [04-legal-y-riesgos.md](04-legal-y-riesgos.md).

## Flujos críticos

### 1. Reserva con pago adelantado (resiliencia)

```
Paciente elige slot
  → crear Turno estado=PENDIENTE_PAGO, expira_en = now()+15min
      (la restricción EXCLUDE de Postgres impide que otro tome el mismo slot)
  → crear preferencia MP (external_reference = turno.id, marketplace_fee)
  → paciente paga en MP
  → webhook MP (idempotente por payment_id)
      → aprobado:  Turno → CONFIRMADO, Pago → APROBADO
      → rechazado: Turno → CANCELADO (libera slot)
  → job "expirar-pendientes" cada minuto: PENDIENTE_PAGO vencidos → EXPIRADO
  → job "conciliar-pagos" diario: compara pagos de MP vs. turnos
```

Reglas:
- **Webhooks idempotentes.** Guardamos cada evento con su id único y lo procesamos una sola vez.
- **Un pago aprobado tarde sobre un turno expirado** se reintegra solo, o se reasigna si el slot sigue libre.
- **El estado del turno es una máquina de estados explícita.** Ninguna transición se hace con un `UPDATE` suelto.

### 2. Turno cargado por la secretaria

Mismo modelo, pero con `origen=PANEL` y sin pago (o con un "pago registrado manualmente"). La misma restricción de base protege contra choques con reservas online.

### 3. Recordatorios

Al confirmar un turno se programan eventos en Inngest para T-48 h y T-24 h. Cada recordatorio:
1. Revisa el estado actual del turno antes de enviar.
2. Manda la plantilla de WhatsApp con botones Confirmar, Cancelar y Reprogramar.
3. Recibe la respuesta por webhook y aplica la política de cancelación.

### 4. Frescura de precios

Un job semanal busca precios con `vigente_desde` de más de N días y le manda al profesional un link de un toque: "¿Siguen vigentes? Sí / Actualizar". Si confirma, se registra la confirmación aunque el monto no cambie, y el contador "actualizado hace…" vuelve a cero.

## Seguridad y datos sensibles

- **Multi-organización:** todas las tablas de negocio llevan `organizacion_id`. Postgres Row Level Security como segunda barrera, además del chequeo en la app.
- **Datos personales sensibles** (DNI, teléfono, notas clínicas futuras): cifrado a nivel columna para lo más delicado, y TLS más cifrado en reposo del proveedor.
- **Auditoría:** tabla `auditoria` append-only (quién, qué, cuándo) para cambios en turnos, precios y accesos a datos de pacientes. La Ley 26.529 lo va a exigir cuando haya historia clínica.
- **Mínimo dato:** en fases 0 y 1 **no guardamos información clínica**. Solo agenda y contacto.

## Decisiones (ADR resumidos)

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| 001 | Monolito modular en Next.js | Microservicios | 2 personas, 0 usuarios. Las fronteras de módulo alcanzan |
| 002 | Postgres + PostGIS | DynamoDB / Firebase | Consultas geoespaciales y restricciones transaccionales |
| 003 | Anti doble reserva con `EXCLUDE USING gist` | Locks en la app | La garantía vive en la DB y sobrevive a bugs y concurrencia |
| 004 | Mercado Pago marketplace (split) | Cobrar nosotros y transferir | No custodiamos fondos y evitamos regulación de PSP; el profesional cobra al instante |
| 005 | Organización como unidad de tenencia | Profesional como tenant | Escala a consultorios compartidos, clínicas y hospitales |
| 006 | Receta electrónica integrada (RCTA) antes que propia | Construirla en el MVP | La plataforma propia requiere registro en ReNaPDiS; queda en fase 3 |
| 007 | Jobs en Inngest | SQS + Lambda | Menos configuración; si crecemos, migrar a AWS es viable |
