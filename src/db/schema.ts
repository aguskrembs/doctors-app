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

// Migraciones idempotentes: corren en cada arranque, así las bases locales ya
// creadas (.data/) se actualizan sin tener que borrarlas.
// Simplificación del prototipo: la disponibilidad cuelga del consultorio
// (en docs/03 cuelga de `atencion` y tiene vigencia).
export const MIGRACIONES = /* sql */ `
CREATE TABLE IF NOT EXISTS disponibilidad (
  id             serial PRIMARY KEY,
  consultorio_id int NOT NULL REFERENCES consultorio(id),
  dia_semana     smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),  -- 0 = domingo
  hora_desde     time NOT NULL,
  hora_hasta     time NOT NULL CHECK (hora_hasta > hora_desde)
);

ALTER TABLE paciente ADD COLUMN IF NOT EXISTS email text;

-- Reserva online: token para las URLs del paciente, snapshot de precio y política, y vencimiento del pago.
ALTER TABLE turno ADD COLUMN IF NOT EXISTS token text UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS precio_centavos bigint;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS cargo_centavos bigint;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS politica_cancelacion text;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS expira_en timestamptz;
ALTER TABLE turno ADD COLUMN IF NOT EXISTS creado_en timestamptz NOT NULL DEFAULT now();

-- Horarios del seed (mismos que el resumen legible consultorio.dias).
INSERT INTO disponibilidad (consultorio_id, dia_semana, hora_desde, hora_hasta)
SELECT * FROM (VALUES
  (1, 1, time '09:00', time '13:00'), (1, 3, time '09:00', time '13:00'),   -- Palermo: Lun y Mié 9-13
  (2, 2, time '09:00', time '13:00'),                                       -- Belgrano: Mar 9-13
  (3, 4, time '15:00', time '19:00'),                                       -- San Isidro: Jue 15-19
  (4, 1, time '10:00', time '18:00'), (4, 2, time '10:00', time '18:00'),   -- Recoleta: Lun a Vie 10-18
  (4, 3, time '10:00', time '18:00'), (4, 4, time '10:00', time '18:00'),
  (4, 5, time '10:00', time '18:00'),
  (5, 3, time '14:00', time '18:00'), (5, 5, time '14:00', time '18:00')    -- Caballito: Mié y Vie 14-18
) AS v(consultorio_id, dia_semana, hora_desde, hora_hasta)
WHERE NOT EXISTS (SELECT 1 FROM disponibilidad);

-- Usuarios de demo con datos personales y cobertura. El DNI se guarda cifrado
-- desde la app (src/cifrado.ts), por eso no se carga acá.
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS usuario_demo boolean NOT NULL DEFAULT false;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS dni_cifrado text;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS cobertura_financiador text;  -- NULL = particular
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS cobertura_plan text;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS nro_afiliado text;

UPDATE paciente SET usuario_demo = true, email = 'maria.gomez@ejemplo.com',
       cobertura_financiador = 'Prepaga A', cobertura_plan = '310', nro_afiliado = '0310-55871'
 WHERE id = 1 AND NOT usuario_demo;
UPDATE paciente SET usuario_demo = true, email = 'julian.rios@ejemplo.com',
       cobertura_financiador = 'Obra social C', cobertura_plan = 'General', nro_afiliado = '7731-2209'
 WHERE id = 2 AND NOT usuario_demo;
UPDATE paciente SET usuario_demo = true, email = 'carla.suarez@ejemplo.com'
 WHERE id = 3 AND NOT usuario_demo;

ALTER TABLE profesional ADD COLUMN IF NOT EXISTS matricula_jurisdiccion text;
ALTER TABLE profesional ADD COLUMN IF NOT EXISTS matricula_numero text;
UPDATE profesional p SET matricula_jurisdiccion = v.j, matricula_numero = v.n
  FROM (VALUES (1, 'CABA', 'MN 112.233'), (2, 'Nacional', 'MN 98.104'),
               (3, 'CABA', 'MN 7.715'),   (4, 'Prov. de Buenos Aires', 'MP 445.566')) AS v(id, j, n)
 WHERE p.id = v.id AND p.matricula_numero IS NULL;
`;
