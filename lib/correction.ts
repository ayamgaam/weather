// Pure, dependency-free arithmetic for the MOS-lite bias correction (Layer 2).
// Kept separate from network code so it can be unit-tested offline.

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export interface BiasResult {
  bias: number; // mean(forecast - actual)
  mae: number;  // mean(|forecast - actual|)
  n: number;    // number of valid paired days
}

/**
 * Align a forecast series with an observed (actual) series by index and compute
 * the mean signed bias and the mean absolute error. Pairs where either value is
 * null/NaN are skipped.
 */
export function biasAndMae(forecast: Array<number | null>, actual: Array<number | null>): BiasResult {
  const diffs: number[] = [];
  const absDiffs: number[] = [];
  const n = Math.min(forecast.length, actual.length);
  for (let i = 0; i < n; i++) {
    const f = forecast[i];
    const a = actual[i];
    if (f == null || a == null || Number.isNaN(f) || Number.isNaN(a)) continue;
    const d = f - a;
    diffs.push(d);
    absDiffs.push(Math.abs(d));
  }
  return {
    bias: diffs.length ? mean(diffs) : NaN,
    mae: absDiffs.length ? mean(absDiffs) : NaN,
    n: diffs.length,
  };
}

/** corrected = raw - bias, rounded to one decimal. */
export function applyBias(raw: number, bias: number): number {
  return round1(raw - bias);
}

/** Align two date->value maps and return parallel arrays in shared-date order. */
export function alignByDate(
  forecast: Record<string, number | null>,
  actual: Record<string, number | null>,
): { dates: string[]; forecast: Array<number | null>; actual: Array<number | null> } {
  const dates = Object.keys(forecast)
    .filter((d) => d in actual)
    .sort();
  return {
    dates,
    forecast: dates.map((d) => forecast[d]),
    actual: dates.map((d) => actual[d]),
  };
}
