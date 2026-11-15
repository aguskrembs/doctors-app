// Datos de ejemplo del piloto (inventados). Los precios tienen distinta antigüedad
// a propósito, para ver el "actualizado hace N días".
export const SEED = /* sql */ `
INSERT INTO profesional (nombre, especialidad, matricula_ok, politica_cancelacion) VALUES
  ('Dra. Lucía Fernández', 'Odontología',  true,  'FLEXIBLE'),
  ('Dra. Marina Quiroga',  'Cardiología',  true,  'MODERADA'),
  ('Lic. Tomás Peralta',   'Kinesiología', true,  'FLEXIBLE'),
  ('Dra. Sofía Benítez',   'Ginecología',  false, 'ESTRICTA');

INSERT INTO consultorio (profesional_id, nombre, barrio, lat, lng, dias) VALUES
  (1, 'Consultorio Palermo',      'Palermo',    -34.5880, -58.4300, 'Lun y Mié 9-13'),
  (2, 'Centro Médico Belgrano',   'Belgrano',   -34.5627, -58.4565, 'Mar 9-13'),
  (2, 'Consultorio San Isidro',   'San Isidro', -34.4708, -58.5286, 'Jue 15-19'),
  (3, 'Kinesio Recoleta',         'Recoleta',   -34.5875, -58.3974, 'Lun a Vie 10-18'),
  (4, 'Consultorio Caballito',    'Caballito',  -34.6186, -58.4423, 'Mié y Vie 14-18');

INSERT INTO prestacion (profesional_id, nombre, duracion_min) VALUES
  (1, 'Consulta y control',    30),
  (1, 'Limpieza dental',       45),
  (2, 'Consulta cardiológica', 30),
  (3, 'Sesión de kinesiología',45),
  (4, 'Consulta ginecológica', 30);

INSERT INTO precio (prestacion_id, monto_centavos, vigente_desde) VALUES
  (1, 3500000, now() - interval '2 days'),
  (2, 5200000, now() - interval '2 days'),
  (3, 4800000, now() - interval '3 days'),
  (4, 2800000, now() - interval '12 days'),
  (5, 4200000, now() - interval '47 days');

INSERT INTO cobertura (profesional_id, financiador, modalidad, plus_centavos) VALUES
  (1, 'Prepaga A',        'REINTEGRO', NULL),
  (2, 'Prepaga A',        'CONVENIO',  1500000),
  (2, 'Prepaga B',        'REINTEGRO', NULL),
  (3, 'Prepaga B',        'REINTEGRO', NULL),
  (4, 'Obra social C',    'CONVENIO',  800000);

INSERT INTO paciente (nombre, telefono) VALUES
  ('María Gómez',   '+54 9 11 5555-0101'),
  ('Julián Ríos',   '+54 9 11 5555-0102'),
  ('Carla Suárez',  '+54 9 11 5555-0103'),
  ('Pedro Alonso',  '+54 9 11 5555-0104');

-- Turnos de hoy (hora de Buenos Aires)
INSERT INTO turno (profesional_id, consultorio_id, prestacion_id, paciente_id, horario, estado, origen)
SELECT t.prof, t.cons, t.prest, t.pac,
  tstzrange(
    ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + t.desde) AT TIME ZONE 'America/Argentina/Buenos_Aires',
    ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + t.hasta) AT TIME ZONE 'America/Argentina/Buenos_Aires'),
  t.estado, t.origen
FROM (VALUES
  (1,1,1,1, time '09:00', time '09:30', 'CONFIRMADO',     'ONLINE'),
  (1,1,2,2, time '10:00', time '10:45', 'CONFIRMADO',     'PANEL'),
  (1,1,1,3, time '11:30', time '12:00', 'PENDIENTE_PAGO','ONLINE'),
  (3,4,4,4, time '10:00', time '10:45', 'CONFIRMADO',     'PANEL')
) AS t(prof, cons, prest, pac, desde, hasta, estado, origen);
`;
