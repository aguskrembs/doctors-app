// Esquema reducido de docs/03-modelo-de-datos.md.
// Diferencia con producción: ubicación como lat/lng (PGlite no trae PostGIS).
// La restricción anti doble reserva (EXCLUDE) es la real.
export const SCHEMA = /* sql */ `
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE profesional (
  id            serial PRIMARY KEY,
  nombre        text NOT NULL,
  especialidad  text NOT NULL,
  matricula_ok  boolean NOT NULL DEFAULT false,
  politica_cancelacion text NOT NULL DEFAULT 'FLEXIBLE'
);

CREATE TABLE consultorio (
  id            serial PRIMARY KEY,
  profesional_id int NOT NULL REFERENCES profesional(id),
  nombre        text NOT NULL,
  barrio        text NOT NULL,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  dias          text NOT NULL            -- resumen legible: "Lun y Mié 9-13"
);

CREATE TABLE prestacion (
  id            serial PRIMARY KEY,
  profesional_id int NOT NULL REFERENCES profesional(id),
  nombre        text NOT NULL,
  duracion_min  int NOT NULL CHECK (duracion_min > 0)
);

CREATE TABLE precio (
  id            serial PRIMARY KEY,
  prestacion_id int NOT NULL REFERENCES prestacion(id),
  monto_centavos bigint NOT NULL CHECK (monto_centavos > 0),
  vigente_desde timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cobertura (
  id            serial PRIMARY KEY,
  profesional_id int NOT NULL REFERENCES profesional(id),
  financiador   text NOT NULL,
  modalidad     text NOT NULL CHECK (modalidad IN ('CONVENIO','REINTEGRO')),
  plus_centavos bigint
);

CREATE TABLE paciente (
  id            serial PRIMARY KEY,
  nombre        text NOT NULL,
  telefono      text
);

CREATE TABLE turno (
  id            serial PRIMARY KEY,
  profesional_id int NOT NULL REFERENCES profesional(id),
  consultorio_id int NOT NULL REFERENCES consultorio(id),
  prestacion_id int NOT NULL REFERENCES prestacion(id),
  paciente_id   int NOT NULL REFERENCES paciente(id),
  horario       tstzrange NOT NULL,
  estado        text NOT NULL CHECK (estado IN
                ('PENDIENTE_PAGO','CONFIRMADO','ATENDIDO','AUSENTE','CANCELADO','EXPIRADO')),
  origen        text NOT NULL CHECK (origen IN ('ONLINE','PANEL')),
  CONSTRAINT turno_sin_superposicion EXCLUDE USING gist (
    profesional_id WITH =,
    horario WITH &&
  ) WHERE (estado IN ('PENDIENTE_PAGO','CONFIRMADO','ATENDIDO'))
);
`;
