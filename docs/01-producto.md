# Producto: turnos médicos particulares transparentes

> Estado: borrador v0.1 · 2026-11-14

## Tesis

En Argentina cada vez más médicos atienden de forma particular: las prepagas pagan poco y tarde (60 a 90 días). El paciente no sabe cuánto sale una consulta ni cuánto le reintegran, y pide el turno por WhatsApp a una secretaria.

**Nuestra apuesta:** primero le damos al médico una agenda excelente, que cobra por adelantado y reduce el ausentismo. Arriba de esa agenda armamos un mapa público con precios reales y actualizados.

- **El médico** gana una agenda práctica, cobro inmediato, menos ausencias y un perfil verificado.
- **El paciente** gana buscar por especialidad y zona, ver el precio vigente y su fecha, saber qué cobertura aplica, y reservar y pagar en un solo paso.

## Usuarios

| Rol | Necesidad principal |
|---|---|
| Profesional | Llenar la agenda, cobrar rápido, no perder tiempo administrando |
| Secretario/a | Usar la agenda como fuente de verdad única: cargar los turnos que le piden por teléfono o mensaje, reprogramar, ver el día |
| Paciente | Encontrar, comparar precio y cobertura, reservar, recibir recordatorios |
| Admin (nosotros) | Verificar matrículas, moderar reseñas, soporte |

## Piloto

- **Profesionales:** odontóloga, cardióloga, kinesiólogo, ginecóloga.
- **Zona:** CABA y San Isidro.
- **Implicancias:**
  - Las prestaciones tienen duraciones muy distintas. Kinesiología se organiza por sesiones y tratamientos; odontología, por tratamientos de varias visitas.
  - Ya desde el piloto hay profesionales que atienden en más de un consultorio.

## Métricas de éxito (a 3 meses del piloto)

| Dimensión | Métrica | Objetivo |
|---|---|---|
| Adopción | Profesionales que usan la agenda como fuente de verdad (≥80% de sus turnos cargados) | 4/4 piloto, luego 20 |
| Volumen | Turnos/mes gestionados | 200 |
| Ausentismo | % de turnos no asistidos | < 10% (vs. 20-30% típico) |
| Transparencia | % de perfiles con precio actualizado en los últimos 30 días | > 90% |
| Look & feel | Tiempo para que una secretaria cargue un turno | < 15 s |
| Look & feel | Tiempo de reserva del paciente (búsqueda → pago) | < 2 min |
| Resiliencia | Turnos duplicados (doble reserva del mismo horario) | **0, garantizado por la base de datos** |
| Resiliencia | Pagos aprobados sin turno confirmado (o al revés) | 0, con conciliación diaria |
| Resiliencia | Disponibilidad mensual | 99.5% |

## Alcance por fases

### Fase 0: agenda para el profesional (sin pacientes externos)
- Registro del profesional con verificación de matrícula: REFEPS/SISA más revisión manual, y badge "verificado".
- Consultorios: uno o varios, con su precisión de ubicación configurable.
- Prestaciones: duración, precio y fecha de vigencia.
- Disponibilidad semanal por consultorio, más excepciones (vacaciones, feriados).
- Agenda día/semana para profesional y secretario: alta rápida, reprogramación, estados del turno.
- Pacientes del profesional: alta rápida con nombre y teléfono.
- Recordatorios por WhatsApp a las 48 h y 24 h (email como alternativa, con `.ics`). El mensaje solo avisa y trae un link a una página donde el paciente confirma, cancela o reprograma con un toque.
- Recordatorio al profesional para revisar sus precios (semanal o mensual, configurable).

### Fase 1: marketplace particular
- Mapa y búsqueda por especialidad, zona, precio y cobertura.
- Perfil público: precio vigente con "actualizado hace N días", coberturas y consultorios.
- Reserva y pago obligatorio por adelantado para turnos particulares (Mercado Pago). Cobramos comisión.
- Políticas de cancelación y cambio estandarizadas (plantillas, ver más abajo).
- Cobertura declarada por el profesional:
  - "da factura para reintegro";
  - "acepta Prepaga X, plan Y, con plus de $Z".

### Fase 2: cobertura y confianza
- Reseñas solo de turnos que ocurrieron, con moderación y derecho a réplica.
- Turnos por prepaga (sin pago adelantado, o con seña del plus).
- Seguimiento de reintegros del paciente: carga manual de facturas y "usaste 28% de tu tope de odontología". Ver riesgos.

### Fase 3: plataforma clínica (producto regulado)
- Receta electrónica: integración con plataforma habilitada (RCTA) → plataforma propia registrada en ReNaPDiS.
- Historia clínica.
- Órdenes y turnos para estudios.
- Integración con instituciones (clínicas, hospitales) vía HL7 FHIR.

## Políticas de cancelación estandarizadas

En vez de texto libre, el profesional elige una plantilla con parámetros. Así el paciente siempre lee lo mismo, y el sistema puede ejecutar la política solo (reintegros automáticos).

| Plantilla | Regla |
|---|---|
| Flexible | Cancelación o cambio gratis hasta 24 h antes; después, 50% |
| Moderada | Gratis hasta 48 h; después, sin reintegro |
| Estricta | Gratis hasta 72 h; después, sin reintegro |

Además hay reglas transversales: hasta 1 reprogramación gratis dentro de la ventana, y reintegro del 100% si cancela el profesional.

## Fuera de alcance (por ahora)

- **Interactuar con la app vía WhatsApp** (botones de respuesta, chatbot, interpretar texto). WhatsApp es el canal principal de aviso, pero cada acción ocurre en nuestra UI: saltar entre apps e interpretar lo que escribe el usuario empeora la experiencia.
- Telemedicina.
- Facturación electrónica ARCA desde la app. A futuro conviene integrarla, porque el reintegro depende de la factura.
- App nativa: arrancamos con web responsive y PWA.
