export const OFFSET_PERU_MS = 5 * 60 * 60 * 1000;

/**
 * Retorna el instante actual desplazado -5 horas. 
 * Útil para derivar el año/mes/día local de Perú usando métodos getUTC*
 */
export function getPeruNow() {
  return new Date(Date.now() - OFFSET_PERU_MS);
}

/**
 * Convierte un instante UTC a un objeto Date desplazado -5 horas.
 */
export function toPeruDate(date: Date) {
  return new Date(date.getTime() - OFFSET_PERU_MS);
}

/**
 * Interpreta un string ISO local (sin zona, ej. "2026-06-05T18:30") como hora de Perú
 * y lo convierte a un objeto Date en UTC (instante real).
 * Suma 5 horas para llegar a UTC.
 */
export function parsePeruDatetimeLocal(isoString: string): Date {
  const date = new Date(isoString + "Z"); // Forzamos interpretación como UTC base
  return new Date(date.getTime() + OFFSET_PERU_MS);
}

/**
 * Formatea un objeto Date (o instante UTC) a un string compatible con <input type="datetime-local">
 * ajustado a la zona horaria de Perú (UTC-5).
 */
export function formatToPeruDatetimeLocal(date: Date): string {
  const peruDate = new Date(date.getTime() - OFFSET_PERU_MS);
  return peruDate.toISOString().slice(0, 16);
}

/**
 * Formatea una fecha (Date o string ISO) a un string legible en formato Perú 24h.
 * Ejemplo: "07/06/2026 18:12"
 */
export function formatPeruDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  });
}

