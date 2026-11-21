"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { hrefBuscar } from "./href-buscar";
import { TarjetaProfesional, type ProfesionalVM } from "./tarjeta-profesional";

// Radio caminable: 15 minutos a ~5 km/h. Es un círculo aproximado; una isócrona
// real (por calles) necesita un servicio de ruteo y queda para más adelante.
const MIN_CAMINANDO = 15;
const M_POR_MIN = 5000 / 60;
const RADIO_M = MIN_CAMINANDO * M_POR_MIN;
const OBELISCO = { lat: -34.6037, lng: -58.3816 };
// Tiles gratuitos sin API key para el prototipo; en producción, MapTiler (ver docs/02).
const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const MOBILE = "(max-width: 720px)";

type Pos = { lat: number; lng: number; aproximada: boolean };
type LatLng = { lat: number; lng: number };
type Seleccion = { profId: number; consId: number };

function distanciaM(a: LatLng, b: LatLng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const deltas = (c: LatLng, radioM: number) => ({ dy: radioM / 110540, dx: radioM / (111320 * Math.cos((c.lat * Math.PI) / 180)) });

function circulo(c: LatLng, radioM: number, pasos = 72) {
  const { dx, dy } = deltas(c, radioM);
  const anillo = Array.from({ length: pasos + 1 }, (_, i) => {
    const t = (i / pasos) * 2 * Math.PI;
    return [c.lng + dx * Math.cos(t), c.lat + dy * Math.sin(t)];
  });
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [anillo] } };
}

const distanciaTexto = (m: number) =>
  m < M_POR_MIN * 60 ? `${Math.max(1, Math.round(m / M_POR_MIN))} min caminando` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;

type Props = {
  profesionales: ProfesionalVM[];
  especialidades: { nombre: string; cantidad: number }[];
  totalProfesionales: number;
  esp?: string;
  /** null = paciente particular; undefined = visitante. */
  coberturaPaciente?: string | null;
};

export function VistaMapa({ profesionales, especialidades, totalProfesionales, esp, coberturaPaciente }: Props) {
  const router = useRouter();
  const modal = useRef<HTMLDialogElement>(null);
  const [borrador, setBorrador] = useState<string | undefined>(esp);
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MlMap | null>(null);
  const marcadores = useRef<{ marker: Marker; el: HTMLElement; consId: number }[]>([]);
  const [pos, setPos] = useState<Pos | null>(null);
  const [listo, setListo] = useState(false);
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [abierta, setAbierta] = useState(false);

  const cerrar = useCallback(() => setAbierta(false), []);

  // 1. Ubicación del paciente (con fallback si no da permiso).
  useEffect(() => {
    const fallback = () => setPos({ ...OBELISCO, aproximada: true });
    if (!("geolocation" in navigator)) return fallback();
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, aproximada: false }),
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  // 2. Mapa centrado en el paciente, con el radio caminable.
  useEffect(() => {
    if (!pos || !contenedor.current || mapa.current) return;
    let cancelado = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelado || !contenedor.current) return;
      ml.setWorkerUrl("/vendor/maplibre-gl-worker.mjs"); // ver scripts/copiar-worker-mapa.mjs
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#134e3f";

      const m = new ml.Map({
        container: contenedor.current,
        style: ESTILO,
        center: [pos.lng, pos.lat],
        zoom: 14,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("click", cerrar);
      mapa.current = m;

      m.on("load", () => {
        m.addSource("radio", { type: "geojson", data: circulo(pos, RADIO_M) });
        m.addLayer({ id: "radio-fill", type: "fill", source: "radio", paint: { "fill-color": accent, "fill-opacity": 0.08 } });
        m.addLayer({
          id: "radio-borde", type: "line", source: "radio",
          paint: { "line-color": accent, "line-width": 1.5, "line-dasharray": [3, 2] },
        });
        // Encuadre: el radio caminable completo, con aire para los filtros flotantes.
        const { dx, dy } = deltas(pos, RADIO_M);
        m.fitBounds([[pos.lng - dx, pos.lat - dy], [pos.lng + dx, pos.lat + dy]], {
          padding: { top: 72, bottom: 56, left: 24, right: 24 }, duration: 0,
        });
        const yo = document.createElement("div");
        yo.className = "yo";
        yo.setAttribute("aria-label", "Tu ubicación");
        new ml.Marker({ element: yo }).setLngLat([pos.lng, pos.lat]).addTo(m);
        setListo(true);
      });
    })();
    return () => { cancelado = true; };
  }, [pos, cerrar]);

  // 3. Un pin por consultorio de los profesionales filtrados.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !pos) return;
    let cancelado = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelado) return;
      marcadores.current.forEach(({ marker }) => marker.remove());
      marcadores.current = profesionales.flatMap((p) =>
        p.consultorios.map((c) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = distanciaM(pos, c) <= RADIO_M ? "pin" : "pin lejos";
          el.setAttribute("aria-label", `${p.nombre}, ${p.especialidad}, ${c.barrio}`);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            setSel({ profId: p.id, consId: c.id });
            setAbierta(true);
            // Que el pin no quede tapado por la hoja.
            const r = m.getContainer().getBoundingClientRect();
            const padding = window.matchMedia(MOBILE).matches
              ? { top: 0, left: 0, right: 0, bottom: Math.round(r.height * 0.55) }
              : { top: 0, bottom: 0, left: 0, right: Math.min(420, r.width * 0.5) };
            m.easeTo({ center: [c.lng, c.lat], padding, duration: 450 });
          });
          return { marker: new ml.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(m), el, consId: c.id };
        }),
      );
    })();
    return () => { cancelado = true; };
  }, [profesionales, listo, pos]);

  // Pin activo resaltado.
  useEffect(() => {
    marcadores.current.forEach(({ el, consId }) => el.classList.toggle("activo", abierta && sel?.consId === consId));
  }, [sel, abierta, profesionales, listo]);

  // Si el filtro saca al profesional abierto, se cierra la hoja.
  useEffect(() => {
    if (sel && !profesionales.some((p) => p.id === sel.profId)) setAbierta(false);
  }, [profesionales, sel]);

  // Escape cierra; al desmontar se libera el mapa.
  useEffect(() => {
    // Con el modal abierto, Escape lo cierra a él (nativo de <dialog>), no a la hoja.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !modal.current?.open && cerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cerrar]);
  useEffect(() => () => { mapa.current?.remove(); mapa.current = null; }, []);

  const abrirFiltros = () => {
    setBorrador(esp);
    modal.current?.showModal();
  };
  const aplicarFiltros = () => {
    modal.current?.close();
    if (borrador !== esp) router.push(hrefBuscar(borrador, "mapa"), { scroll: false });
  };
  const cantidadBorrador = borrador ? (especialidades.find((e) => e.nombre === borrador)?.cantidad ?? 0) : totalProfesionales;

  const prof = sel && profesionales.find((p) => p.id === sel.profId);
  const cons = prof?.consultorios.find((c) => c.id === sel?.consId);
  const total = profesionales.reduce((n, p) => n + p.consultorios.length, 0);
  const cerca = pos ? profesionales.reduce((n, p) => n + p.consultorios.filter((c) => distanciaM(pos, c) <= RADIO_M).length, 0) : 0;

  return (
    <section className="vista-mapa" aria-label="Mapa de profesionales">
      <div ref={contenedor} className="mapa" />
      {!pos && <p className="mapa-espera muted small">Buscando tu ubicación…</p>}

      <button
        type="button"
        className={esp ? "btn-filtros activo" : "btn-filtros"}
        onClick={abrirFiltros}
        aria-haspopup="dialog"
        aria-label={esp ? `Filtros: ${esp}` : "Filtros"}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {esp && <span className="btn-filtros-txt">{esp}</span>}
      </button>

      <dialog
        ref={modal}
        className="modal-filtros"
        aria-labelledby="titulo-filtros"
        onClick={(e) => e.target === e.currentTarget && modal.current?.close()} /* click en el fondo */
      >
        <div className="modal-caja">
          <header className="modal-cab">
            <h2 id="titulo-filtros">Filtros</h2>
            <button type="button" className="hoja-cerrar" onClick={() => modal.current?.close()} aria-label="Cerrar filtros">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </header>

          <fieldset className="modal-grupo">
            <legend>Especialidad</legend>
            <div className="chips">
              <button type="button" className={!borrador ? "chip on" : "chip"} aria-pressed={!borrador} onClick={() => setBorrador(undefined)}>
                Todas <span className="chip-n mono">{totalProfesionales}</span>
              </button>
              {especialidades.map((e) => (
                <button key={e.nombre} type="button" className={borrador === e.nombre ? "chip on" : "chip"} aria-pressed={borrador === e.nombre} onClick={() => setBorrador(e.nombre)}>
                  {e.nombre} <span className="chip-n mono">{e.cantidad}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <footer className="modal-pie">
            <button type="button" className="btn-texto" onClick={() => setBorrador(undefined)} disabled={!borrador}>Limpiar</button>
            <button type="button" className="btn" onClick={aplicarFiltros}>
              Ver {cantidadBorrador} {cantidadBorrador === 1 ? "profesional" : "profesionales"}
            </button>
          </footer>
        </div>
      </dialog>

      {pos && (
        <div className="mapa-leyenda small">
          <span><span className="ref-radio" aria-hidden="true" /> {MIN_CAMINANDO} min caminando</span>
          <span className="muted">· {cerca} cerca · {total - cerca} más lejos</span>
          {pos.aproximada && <span className="mapa-aviso">Sin acceso a tu ubicación: centramos en el Obelisco</span>}
        </div>
      )}

      <aside className={abierta ? "hoja abierta" : "hoja"} inert={!abierta} aria-label="Profesional seleccionado">
        {prof && cons && (
          <TarjetaProfesional
            p={prof}
            reservarHref={`/reservar/${prof.id}?consultorio=${cons.id}`}
            coberturaPaciente={coberturaPaciente}
            accion={
              <button type="button" className="hoja-cerrar" onClick={cerrar} aria-label="Cerrar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            }
            extra={pos && (
              <p className="hoja-dist mono small">
                {cons.barrio} · {distanciaTexto(distanciaM(pos, cons))}{pos.aproximada ? " desde el Obelisco" : ""}
              </p>
            )}
          />
        )}
      </aside>
    </section>
  );
}
