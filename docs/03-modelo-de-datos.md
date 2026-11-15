# Modelo de datos inicial

> Estado: borrador v0.1 · 2026-11-14 · Postgres 16 + PostGIS + btree_gist

## Entidades

```
Organizacion 1─N Membresia N─1 Usuario          (roles: OWNER, PROFESIONAL, SECRETARIO)
Organizacion 1─N Profesional 1─N Matricula
Organizacion 1─N Consultorio
Profesional N─N Consultorio        vía Atencion (dónde atiende)
Profesional 1─N Prestacion 1─N Precio (con vigencia) 1─N ConfirmacionPrecio
Atencion   1─N ReglaDisponibilidad (semanal) + ExcepcionDisponibilidad
Profesional N─N PlanCobertura      vía ProfesionalCobertura (modalidad + plus)
Financiador 1─N PlanCobertura      (prepagas / obras sociales)
Turno N─1 Profesional, Consultorio, Prestacion, Paciente
Turno 1─N Pago, 1─N EventoTurno (historial de estados)
Paciente  (por organización; luego se vincula a una cuenta de Usuario si reserva online)
```

**Decisiones clave:**
- **Precio con historial.** No se pisa el valor: se agrega una fila con `vigente_desde`, y eso alimenta el "actualizado hace N días".
- **Turno con snapshot.** Al reservar se copian el precio, la comisión y la política de cancelación. Si el profesional cambia el precio mañana, el turno de hoy no cambia.
- **Paciente scoped por organización.** La secretaria da de alta a "María, 11-…" sin que María tenga cuenta. Cuando María reserva online, se vincula su `usuario_id`.

## Esquema (SQL de referencia)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Identidad ---------------------------------------------------------------
CREATE TABLE organizacion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('INDIVIDUAL','CONSULTORIO','CLINICA','HOSPITAL')),
  mp_user_id   text,                    -- cuenta Mercado Pago vinculada (OAuth)
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membresia (
  organizacion_id uuid NOT NULL REFERENCES organizacion(id),
  usuario_id      uuid NOT NULL,        -- tabla usuario la gestiona Better Auth
  rol             text NOT NULL CHECK (rol IN ('OWNER','PROFESIONAL','SECRETARIO')),
  profesional_id  uuid,                 -- si es secretario de un profesional puntual
  PRIMARY KEY (organizacion_id, usuario_id)
);

-- Profesionales -----------------------------------------------------------
CREATE TABLE profesional (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizacion(id),
  usuario_id      uuid,
  nombre          text NOT NULL,
  apellido        text NOT NULL,
  especialidades  text[] NOT NULL,      -- luego: tabla catálogo
  bio             text,
  publicado       boolean NOT NULL DEFAULT false,
  politica_cancelacion text NOT NULL DEFAULT 'FLEXIBLE'
                  CHECK (politica_cancelacion IN ('FLEXIBLE','MODERADA','ESTRICTA'))
);

CREATE TABLE matricula (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  uuid NOT NULL REFERENCES profesional(id),
  jurisdiccion    text NOT NULL,        -- 'NACIONAL', 'PBA', 'CABA', ...
  numero          text NOT NULL,
  estado          text NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','VERIFICADA','RECHAZADA')),
  fuente          text,                 -- 'REFEPS', 'MANUAL'
  verificada_en   timestamptz,
  UNIQUE (jurisdiccion, numero)
);

-- Consultorios ------------------------------------------------------------
CREATE TABLE consultorio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizacion(id),
  nombre          text,
  direccion       text NOT NULL,        -- normalizada vía Georef/USIG
  localidad       text NOT NULL,
  ubicacion       geography(Point, 4326) NOT NULL,
  precision_publica text NOT NULL DEFAULT 'EXACTA'
                  CHECK (precision_publica IN ('EXACTA','APROXIMADA','BARRIO')),
  zona_horaria    text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires'
);
CREATE INDEX ON consultorio USING gist (ubicacion);

CREATE TABLE atencion (                 -- profesional atiende en consultorio
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  uuid NOT NULL REFERENCES profesional(id),
  consultorio_id  uuid NOT NULL REFERENCES consultorio(id),
  UNIQUE (profesional_id, consultorio_id)
);

CREATE TABLE regla_disponibilidad (     -- "martes 9 a 13 en Palermo"
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id     uuid NOT NULL REFERENCES atencion(id),
  dia_semana      smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_desde      time NOT NULL,
  hora_hasta      time NOT NULL CHECK (hora_hasta > hora_desde),
  vigente         daterange NOT NULL DEFAULT daterange(current_date, NULL)
);

CREATE TABLE excepcion_disponibilidad ( -- vacaciones, feriados, congreso
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  uuid NOT NULL REFERENCES profesional(id),
  rango           tstzrange NOT NULL,
  motivo          text
);

-- Catálogo y precios ------------------------------------------------------
CREATE TABLE prestacion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  uuid NOT NULL REFERENCES profesional(id),
  nombre          text NOT NULL,        -- 'Consulta', 'Sesión kinesiología', 'Limpieza'
  duracion_min    int  NOT NULL CHECK (duracion_min > 0),
  reservable_online boolean NOT NULL DEFAULT true,
  activa          boolean NOT NULL DEFAULT true
);

CREATE TABLE precio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestacion_id   uuid NOT NULL REFERENCES prestacion(id),
  monto_centavos  bigint NOT NULL CHECK (monto_centavos > 0),
  moneda          char(3) NOT NULL DEFAULT 'ARS',
  vigente_desde   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON precio (prestacion_id, vigente_desde DESC);

CREATE TABLE confirmacion_precio (      -- "sigue vigente" sin cambiar el monto
  precio_id       uuid NOT NULL REFERENCES precio(id),
  confirmado_en   timestamptz NOT NULL DEFAULT now()
);

-- Cobertura ---------------------------------------------------------------
CREATE TABLE financiador (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL, tipo text NOT NULL CHECK (tipo IN ('PREPAGA','OBRA_SOCIAL')));
CREATE TABLE plan_cobertura (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financiador_id uuid NOT NULL REFERENCES financiador(id), nombre text NOT NULL);

CREATE TABLE profesional_cobertura (
  profesional_id  uuid NOT NULL REFERENCES profesional(id),
  plan_id         uuid NOT NULL REFERENCES plan_cobertura(id),
  modalidad       text NOT NULL CHECK (modalidad IN ('CONVENIO','REINTEGRO')),
  plus_centavos   bigint,               -- plus que cobra si es convenio
  PRIMARY KEY (profesional_id, plan_id)
);

-- Pacientes ---------------------------------------------------------------
CREATE TABLE paciente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizacion(id),
  usuario_id      uuid,                 -- si tiene cuenta
  nombre          text NOT NULL,
  telefono_e164   text,
  email           text,
  dni_cifrado     bytea                 -- cifrado a nivel columna
);

-- Turnos (núcleo) ---------------------------------------------------------
CREATE TABLE turno (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizacion(id),
  profesional_id  uuid NOT NULL REFERENCES profesional(id),
  consultorio_id  uuid NOT NULL REFERENCES consultorio(id),
  prestacion_id   uuid NOT NULL REFERENCES prestacion(id),
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  horario         tstzrange NOT NULL,
  estado          text NOT NULL CHECK (estado IN
                  ('PENDIENTE_PAGO','CONFIRMADO','ATENDIDO','AUSENTE',
                   'CANCELADO_PACIENTE','CANCELADO_PROFESIONAL','EXPIRADO')),
  origen          text NOT NULL CHECK (origen IN ('ONLINE','PANEL')),
  modalidad_pago  text NOT NULL CHECK (modalidad_pago IN ('PARTICULAR','COBERTURA','MANUAL')),
  -- snapshot al reservar
  precio_centavos     bigint,
  comision_centavos   bigint,
  politica_cancelacion text NOT NULL,
  expira_en       timestamptz,          -- solo PENDIENTE_PAGO
  version         int NOT NULL DEFAULT 1,  -- optimistic locking
  creado_en       timestamptz NOT NULL DEFAULT now(),

  -- La garantía anti doble reserva: un profesional no puede tener
  -- dos turnos activos que se superpongan.
  CONSTRAINT turno_sin_superposicion EXCLUDE USING gist (
    profesional_id WITH =,
    horario        WITH &&
  ) WHERE (estado IN ('PENDIENTE_PAGO','CONFIRMADO','ATENDIDO'))
);
CREATE INDEX ON turno (profesional_id, lower(horario));

CREATE TABLE evento_turno (             -- historial / auditoría de transiciones
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_id        uuid NOT NULL REFERENCES turno(id),
  de_estado       text,
  a_estado        text NOT NULL,
  actor_usuario_id uuid,
  actor_tipo      text NOT NULL,        -- 'PACIENTE','PANEL','SISTEMA','WEBHOOK'
  ocurrido_en     timestamptz NOT NULL DEFAULT now()
);

-- Pagos -------------------------------------------------------------------
CREATE TABLE pago (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id        uuid NOT NULL REFERENCES turno(id),
  proveedor       text NOT NULL DEFAULT 'MERCADOPAGO',
  proveedor_pago_id text UNIQUE,        -- idempotencia de webhooks
  estado          text NOT NULL,        -- PENDIENTE, APROBADO, RECHAZADO, REINTEGRADO
  monto_centavos  bigint NOT NULL,
  comision_centavos bigint NOT NULL,
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_evento (           -- deduplicación de eventos entrantes
  proveedor       text NOT NULL,
  evento_id       text NOT NULL,
  payload         jsonb NOT NULL,
  procesado_en    timestamptz,
  PRIMARY KEY (proveedor, evento_id)
);
```

## Máquina de estados del turno

```
             ┌──────── expira (15 min) ───────► EXPIRADO
PENDIENTE_PAGO ── pago aprobado ──► CONFIRMADO ── se presentó ──► ATENDIDO
             └── pago rechazado ─► CANCELADO_*        │
                                                      ├── no se presentó ──► AUSENTE
(origen PANEL arranca en CONFIRMADO)                  ├── cancela paciente ─► CANCELADO_PACIENTE (aplica política)
                                                      └── cancela profesional ► CANCELADO_PROFESIONAL (reintegro 100%)
```

Reprogramar no es un estado: se cancela el turno original y se crea uno nuevo, enlazado por `turno_origen_id` (columna a agregar). Así la restricción EXCLUDE sigue protegiendo el nuevo horario.

## Preguntas abiertas del modelo

- ¿Un consultorio compartido tiene boxes que también se reservan? Eso sería una segunda restricción EXCLUDE por `box_id`.
- Tratamientos de varias sesiones (kinesio, odonto): ¿se paga por sesión o por paquete?
- ¿El buffer entre turnos lo maneja la prestación (`buffer_min`) o el profesional?
