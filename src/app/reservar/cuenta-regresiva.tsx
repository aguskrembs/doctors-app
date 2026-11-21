"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Cuenta regresiva del bloqueo del horario. Al llegar a cero, refresca para mostrar el vencimiento. */
export function CuentaRegresiva({ hasta }: { hasta: string }) {
  const router = useRouter();
  const fin = new Date(hasta).getTime();
  const [resta, setResta] = useState(() => Math.max(0, fin - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, fin - Date.now());
      setResta(r);
      if (r === 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [fin, router]);

  const s = Math.ceil(resta / 1000);
  const mmss = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <span className={s < 120 ? "cuenta mono urgente" : "cuenta mono"} role="timer" aria-live="off">
      {mmss}
    </span>
  );
}
