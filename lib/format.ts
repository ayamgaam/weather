export type Unit = "C" | "F";

/** Convert an absolute temperature from Celsius to the chosen unit. */
export function toUnit(celsius: number, unit: Unit): number {
  return unit === "C" ? celsius : celsius * (9 / 5) + 32;
}

/** Format an absolute temperature. `decimals` controls precision of the value. */
export function fmtTemp(celsius: number | null, unit: Unit, decimals = 0): string {
  if (celsius == null || Number.isNaN(celsius)) return "--";
  const v = toUnit(celsius, unit);
  return `${v.toFixed(decimals)}°`;
}

/** Format an error magnitude (a delta, so scale only, no +32 offset). */
export function fmtDelta(celsiusDelta: number | null, unit: Unit): string {
  if (celsiusDelta == null || Number.isNaN(celsiusDelta)) return "";
  const v = unit === "C" ? celsiusDelta : celsiusDelta * (9 / 5);
  return `±${v.toFixed(1)}°`;
}
