# Legal y riesgos

> Estado: borrador v0.1 · 2026-11-14
> **No es asesoramiento legal.** Es la lista de temas para validar con un abogado especializado en salud y datos personales antes de lanzar la fase 1.

## Checklist regulatorio

| Tema | Norma / organismo | Afecta | Qué validar |
|---|---|---|---|
| Datos de salud (sensibles) | Ley 25.326, AAIP | Fase 0+ | Inscripción de la base de datos, consentimiento expreso, política de privacidad, derechos ARCO |
| Transferencia internacional | Ley 25.326, Disp. AAIP 60/2016 | Fase 0+ | Hosting en Brasil o EE.UU.: cláusulas contractuales modelo con Vercel y Neon/Supabase |
| Publicidad de tarifas | Ley 17.132, códigos de ética de colegios médicos (CABA/PBA, distrito San Isidro) | Fase 1 | Aranceles éticos mínimos, reglas de publicidad profesional, por especialidad y jurisdicción. Odontología y kinesiología tienen colegios propios |
| Matrícula | REFEPS / SISA | Fase 0 | Acceso a la API o consulta de SISA, y condiciones de uso |
| Pagos | Mercado Pago marketplace, BCRA | Fase 1 | Que el split no nos convierta en PSP; cómo facturamos la comisión |
| Facturación | ARCA (ex AFIP) | Fase 1 | Facturación de nuestra comisión; la factura del profesional para reintegro |
| Defensa del consumidor | Ley 24.240 | Fase 1 | Políticas de cancelación claras, botón de arrepentimiento, precio final visible con comisión incluida |
| Reseñas | Responsabilidad civil, injurias | Fase 2 | Términos, moderación, procedimiento de baja |
| Historia clínica | Ley 26.529 (y modif. 26.742) | Fase 3 | Inalterabilidad, integridad, firma, conservación (10 años) |
| Receta electrónica | Ley 27.553, Dec. 98/2023, ReNaPDiS | Fase 3 | Registro de plataforma, interoperabilidad, firma del profesional |

## Riesgos de producto (roast de las respuestas)

### 1. Pago adelantado obligatorio + comisión
- **Riesgo:** fricción para el paciente ("¿le pago a alguien que no conozco?"). Encima, la comisión puede leerse como un sobreprecio escondido, que es justo lo contrario de la transparencia.
- **Mitigación:**
  - Mostrar "precio del profesional + cargo de servicio = total" siempre desglosado.
  - Profesional verificado, política de reintegro clara y reintegro automático.
  - Medir la conversión del checkout desde el día 1.

### 2. Pago adelantado en turnos por prepaga
- **Riesgo:** con convenio no hay nada que cobrar, salvo el plus. Si se exige pago, se pierde a esos pacientes.
- **Mitigación:**
  - `modalidad_pago = COBERTURA`: sin pago, o con seña reembolsable si el profesional lo exige.
  - En prepaga con reintegro, el paciente paga el total y pide el reintegro. Ahí sí aplica el pago adelantado.

### 3. Contadores de consumo de prepagas
- **Riesgo:** los topes y porcentajes de cada plan no son datos abiertos ni estandarizados. Mantener los términos de cada plan de cada prepaga a mano es un trabajo infinito y desactualizable, y un dato equivocado daña la confianza.
- **Mitigación:** arrancar del lado del paciente.
  - El paciente carga sus facturas y reintegros, y nosotros llevamos su cuenta.
  - Los topes los carga el paciente o los sumamos de forma colaborativa (crowdsourcing), siempre con fuente y fecha.
  - Más adelante, si hay volumen, buscar acuerdos con prepagas.

### 4. Plataforma propia de receta electrónica
- **Riesgo:** es un producto regulado completo: registro, auditorías, interoperabilidad con farmacias y financiadores.
- **Mitigación:** integrarse con RCTA hasta tener tracción, y diseñar desde ya auditoría e inalterabilidad para que la migración sea posible.

### 5. Desintermediación
- **Riesgo:** el paciente conoce al profesional y el siguiente turno lo pide por WhatsApp.
- **Mitigación:** cobrar por la agenda (SaaS), no solo por el marketplace. Si la secretaria carga en nuestra agenda el turno que le pidieron por fuera, igual seguimos siendo valiosos.

### 6. Pacientes que responden el WhatsApp
- **Riesgo:** el paciente espera conversar ("¿puedo ir 10 minutos más tarde?") y nadie le contesta, o cree que canceló respondiendo "no voy".
- **Mitigación:**
  - El texto de la plantilla lo dice claro: "Confirmá, cancelá o cambiá tu turno acá" con el botón de link.
  - Cualquier respuesta recibe un mensaje automático fijo: "Este número solo envía avisos. Gestioná tu turno acá: link · Consultorio: teléfono". No se interpreta nada.
  - Sub-estado "sin respuesta" en la agenda: la secretaria llama solo a esos pacientes del día siguiente.

### 7. Hospitales
- **Riesgo:** ciclos de venta largos, licitaciones, integraciones con HIS legacy.
- **Mitigación:** no tocar el roadmap por esto hasta tener 100+ profesionales. El modelo `organizacion.tipo` ya lo contempla.
