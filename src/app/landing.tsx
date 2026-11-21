import { CARGO_SERVICIO, cifra, hace, money } from "@/lib";

// Landing del visitante. Reglas (ver docs/superpowers/specs/2026-11-15-landing-y-usuarios-design.md):
// el buscador va arriba y el marketing debajo, nunca entre resultados; nada de prueba social
// inventada; con sesión iniciada esto no se muestra.

type Muestra = {
  profesional: string; especialidad: string; nombre: string;
  duracionMin: number; montoCentavos: number; dias: number;
};

/** Hero: la promesa en una línea y un comprobante real (sale de los datos, no es una ilustración inventada). */
export function HeroLanding({ muestra }: { muestra?: Muestra }) {
  const cargo = muestra ? Math.round(muestra.montoCentavos * CARGO_SERVICIO) : 0;
  return (
    <section className="landing-hero">
      <div className="wrap landing-hero-grid">
        <div className="landing-hero-texto">
          <span className="eyebrow">Turnos particulares · CABA y San Isidro</span>
          <h1>Sabé cuánto sale tu consulta <em>antes</em> de pedir el turno.</h1>
          <p className="landing-bajada">
            Precios reales con su fecha de actualización, qué cubre tu prepaga y horarios libres.
            Reservás y pagás en un solo paso.
          </p>
          <div className="landing-ctas">
            <a href="#buscar" className="btn">Buscar profesional</a>
            <a href="#profesionales" className="btn-texto">Soy profesional</a>
          </div>
        </div>

        {muestra && (
          <figure className="ticket" aria-label="Ejemplo de precio publicado">
            <div className="ticket-cab">
              <span className="display">{muestra.profesional}</span>
              <span className="muted small">{muestra.especialidad}</span>
            </div>
            <div className="recibo mono">
              <div className="linea"><span>{muestra.nombre} · {muestra.duracionMin}&apos;</span><span>{cifra(muestra.montoCentavos)}</span></div>
              <div className="linea sec"><span>Cargo de servicio</span><span>{cifra(cargo)}</span></div>
              <div className="linea total"><span>Total</span><span>{money(muestra.montoCentavos + cargo)}</span></div>
            </div>
            <figcaption className="fresh">Precio actualizado {hace(muestra.dias)}</figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

const Icono = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function SeccionesLanding() {
  return (
    <>
      <section className="landing-seccion" aria-labelledby="como-funciona">
        <span className="eyebrow">Para pacientes</span>
        <h2 id="como-funciona">Cómo funciona</h2>
        <ol className="landing-pasos">
          <li>
            <span className="paso-n mono">1</span>
            <h3>Buscá y compará</h3>
            <p>Por especialidad, en lista o en el mapa con lo que tenés a 15 minutos caminando. Cada precio dice cuándo se actualizó.</p>
          </li>
          <li>
            <span className="paso-n mono">2</span>
            <h3>Elegí el horario</h3>
            <p>Ves los turnos libres de la semana y la política de cancelación con la fecha exacta, antes de pagar.</p>
          </li>
          <li>
            <span className="paso-n mono">3</span>
            <h3>Pagá y listo</h3>
            <p>El turno queda confirmado al instante. Te avisamos por WhatsApp 48 y 24 horas antes.</p>
          </li>
        </ol>
      </section>

      <section className="landing-seccion" aria-labelledby="por-que">
        <h2 id="por-que">Sin letra chica</h2>
        <div className="landing-razones">
          <div>
            <Icono d="M12 8v4l3 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
            <h3>Precio con fecha</h3>
            <p>Cada precio muestra hace cuánto lo confirmó el profesional. Si está viejo, lo marcamos.</p>
          </div>
          <div>
            <Icono d="M7 3h10v18l-2-1.5L12 21l-3-1.5L7 21zM10 8h4M10 12h4" />
            <h3>Todo desglosado</h3>
            <p>Precio del profesional, cargo de servicio y total, siempre separados. Sin sorpresas al pagar.</p>
          </div>
          <div>
            <Icono d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4" />
            <h3>Matrícula verificada</h3>
            <p>Revisamos la matrícula de cada profesional y la marcamos en su perfil.</p>
          </div>
          <div>
            <Icono d="M4 7h16M4 12h16M4 17h10" />
            <h3>Cancelación clara</h3>
            <p>Políticas estándar que se aplican solas. Si cancela el profesional, te devolvemos todo.</p>
          </div>
        </div>
      </section>

      <section className="landing-banda" id="profesionales" aria-labelledby="titulo-prof">
        <div className="wrap landing-banda-grid">
          <div>
            <span className="eyebrow">Para profesionales</span>
            <h2 id="titulo-prof">Tu agenda ordenada, y cobrada por adelantado.</h2>
            <p>Dejá de coordinar turnos por mensaje. Tus pacientes ven tu precio y tus horarios, reservan y pagan solos.</p>
            <div className="sumate">
              <button type="button" className="btn btn-claro" disabled aria-describedby="sumate-nota">Sumate</button>
              <span className="badge-pronto">Muy pronto</span>
            </div>
            <p className="small sumate-nota" id="sumate-nota">Estamos validando a los primeros profesionales a mano.</p>
          </div>
          <ul className="landing-beneficios">
            <li><strong>Cobrás al instante.</strong> El pago va directo a tu cuenta de Mercado Pago.</li>
            <li><strong>Menos ausencias.</strong> Avisos por WhatsApp 48 y 24 horas antes, con link para confirmar o cancelar.</li>
            <li><strong>Una sola agenda.</strong> Tu secretaria carga también los turnos que entran por teléfono.</li>
            <li><strong>Perfil verificado.</strong> Tu matrícula, tus consultorios y tus precios, siempre al día.</li>
          </ul>
        </div>
      </section>

      <section className="landing-seccion" aria-labelledby="preguntas">
        <h2 id="preguntas">Preguntas frecuentes</h2>
        <div className="faq">
          <details>
            <summary>¿Qué es el cargo de servicio?</summary>
            <p>Es lo que cobramos por la reserva: el 5% del precio de la consulta. Lo ves separado antes de pagar, y el resto va directo al profesional.</p>
          </details>
          <details>
            <summary>¿Cómo sé si mi prepaga me cubre?</summary>
            <p>Cada profesional indica con qué coberturas trabaja: por convenio (pagás un plus) o con factura para pedir reintegro. Con tu cuenta te lo mostramos según tu prepaga.</p>
          </details>
          <details>
            <summary>¿Qué pasa si cancelo?</summary>
            <p>Cada profesional elige una política estándar (flexible, moderada o estricta) y la ves antes de pagar, con la fecha límite exacta de tu turno.</p>
          </details>
          <details>
            <summary>¿Cómo verifican a los profesionales?</summary>
            <p>Revisamos la matrícula en el registro nacional y la confirmamos a mano. Las verificadas llevan el sello &quot;Matrícula verificada&quot;.</p>
          </details>
        </div>
      </section>

      <footer className="landing-pie">
        <span className="brand">Turnos<span>.</span></span>
        <span className="muted small">Prototipo · datos de ejemplo del piloto</span>
      </footer>
    </>
  );
}
