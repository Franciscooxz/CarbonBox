const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** "09 oct 2026 · 19:20": formato compacto de registro. */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  // es-CO produce "09 de oct de 2026"; se quitan los "de" y el punto para un formato de registro más compacto.
  const day = dateFormatter.format(date).replace(/ de /g, " ").replace(".", "");
  return `${day} · ${timeFormatter.format(date)}`;
};

export const formatNumber = (value: number): string => numberFormatter.format(value);

/** Rellena con ceros a la izquierda, como el número de asiento de un libro contable. */
export const padNumber = (value: number, width = 3): string => String(value).padStart(width, "0");
