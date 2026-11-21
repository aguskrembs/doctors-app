# Lineamientos generales

> Actualizado: 2026-11-21. Cambian poco y a propósito: si alguno se modifica, se registra en [decisiones/](decisiones/).

Son los criterios con los que se decide todo lo demás. Cuando dos opciones parecen igual de buenas, gana la que respeta mejor estos lineamientos. El detalle de cada tema está en `docs/`; acá va el porqué.

## Visión

Que pedir un turno médico particular en Argentina sea tan claro como comprar cualquier otra cosa: sabés quién te atiende, cuánto pagás, cuánto te devuelve tu cobertura y cuándo, antes de reservar.

**La apuesta:** primero, una agenda excelente para el profesional y su secretaria, que cobra por adelantado y baja el ausentismo. Arriba de esa agenda, un buscador público con precios reales y actualizados. Sin profesionales usando la agenda, el buscador está vacío; por eso el orden importa.

## Principios de producto

1. **Transparencia sobre la plata.** El precio se muestra siempre desglosado: honorario del profesional + cargo de servicio = total. Todo precio lleva su fecha ("actualizado hace N días"). Un precio viejo se marca, no se esconde.
2. **La agenda es el producto.** La pantalla donde trabaja la secretaria es la que más se pule. Configuración, onboarding y perfil existen para alimentarla.
3. **Resolver el problema del profesional antes que el del marketplace.** Cobro inmediato, menos ausencias, menos tiempo administrando. Si una función sirve al buscador pero le agrega trabajo al profesional, se replantea.
4. **WhatsApp avisa, la app resuelve.** WhatsApp es el canal principal de aviso, solo de salida y con un botón de link. No hay chatbot, botones de respuesta ni interpretación de texto: toda acción ocurre en nuestra UI.
5. **Nunca bloquear el uso por configuración incompleta.** Lo que falta (matrícula sin verificar, horarios sin cargar) bloquea *publicar*, no *usar la agenda*.
6. **Confianza verificable.** Matrícula verificada a la vista, políticas de cancelación estándar que el sistema aplica solo, y reseñas solo de turnos que ocurrieron.
7. **Cuidar la agenda del profesional.** Sin cuenta, solo se ve el próximo turno libre; el calendario completo exige cuenta. La agenda de un profesional es información sensible para él.
8. **Construir por fases y no saltearlas.** Fase 0 agenda, Fase 1 marketplace, Fase 2 cobertura y confianza, Fase 3 plataforma clínica. Lo regulado (receta, historia clínica) no entra antes de tiempo.

## Principios de experiencia

- **Dos registros, un sistema.** Lo público busca confianza y deleite (reservar en menos de 2 minutos). El panel busca velocidad (cargar un turno en menos de 15 segundos). Mismas fuentes, colores y componentes.
- **Dos dispositivos, dos ritmos.** La secretaria trabaja en desktop, con teclado. El profesional mira el celular entre paciente y paciente.
- **Un turno se ve igual en todos lados:** agenda, detalle, vista del paciente y mensajes. Los colores de estado son semánticos y no se usan para decorar.
- **Cada pantalla diseña sus estados** vacío, de carga y de error, no solo el camino feliz.
- **El copy dice qué pasó y qué podés hacer.** Español rioplatense con voseo, corto y concreto.
- **Accesible por defecto:** contraste AA, foco visible y todo operable con teclado.

## Principios de ingeniería

- **Las garantías viven en la base de datos.** Cero dobles reservas por restricción de Postgres, no por chequeos en la app.
- **Estados explícitos.** El turno cambia solo a través de su máquina de estados, y cada cambio queda registrado.
- **Simple de operar.** Monolito modular con un solo deploy y plataformas con poca configuración. Las fronteras entre módulos existen para poder separarlos si algún día hace falta, no antes.
- **Multi-organización desde el día 1**, para que entren consultorios compartidos, clínicas y hospitales sin rehacer el modelo.
- **No custodiamos fondos.** El pago va directo a la cuenta del profesional; nosotros cobramos la comisión.
- **La hora es siempre la de Argentina**, sin importar dónde esté el navegador o el servidor.
- **Lo que importa se testea:** cálculo de huecos, políticas y transiciones como funciones puras con tests; los flujos críticos de punta a punta.

## Datos y legalidad

- **Datos de salud = datos sensibles** (Ley 25.326). Se guarda lo mínimo, lo delicado va cifrado y los accesos se auditan.
- **Sin datos clínicos en las Fases 0 y 1.** Las notas de turno son operativas.
- **Lo regulatorio se valida antes de lanzar, no después.** Hay una lista viva en [docs/04-legal-y-riesgos.md](../docs/04-legal-y-riesgos.md) para revisar con un abogado.

## Forma de trabajo

- **Una sola confirmación por decisión.** Un enfoque aprobado cubre también el diseño escrito y el plan que salen de ahí. Se pregunta solo lo nuevo que cambia lo que se construye.
- **Toda decisión queda escrita.** Se registra en [decisiones/](decisiones/) y se baja al doc de `docs/` en el mismo cambio.
- **Si una tarea contradice un lineamiento o un doc, se frena y se pregunta.** Ni el código ni un chat resuelven en silencio una contradicción de producto.
- **Medir antes de opinar.** Las métricas del piloto (adopción, ausentismo, frescura de precios, tiempos de carga y reserva) deciden qué se mejora. Están en [docs/01-producto.md](../docs/01-producto.md#métricas-de-éxito-a-3-meses-del-piloto).
