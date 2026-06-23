import { Station } from "./stations";
import { CorrectionStats, DayLabel, DayPrediction, StationForecast } from "./types";
import { alignByDate, applyBias, biasAndMae } from "./correction";

// ---- Endpoints (Open-Meteo, free, no API key) -----------------------------
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const HISTORICAL_FORECAST_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast";

// ---- Tunables -------------------------------------------------------------
export const REVALIDATE_SECONDS = 10800; // 3 hours (matches Vercel Cron cadence)
const CORRECTION_WINDOW_DAYS = 45;       // ~45-day rolling window for bias/MAE
const ARCHIVE_LAG_DAYS = 6;              // ERA5 archive trails "now" by ~5 days; pad to 6
const MIN_SAMPLE_DAYS = 10;              // below this we fall back to the raw forecast
const FETCH_TIMEOUT_MS = 12000;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Cache at the data layer too, so multiple renders within the window reuse the response.
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    if (json?.error) {
      throw new Error(`Open-Meteo error: ${json.reason ?? "unknown"}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Layer 1: raw forecast (always the baseline / fallback) ----------------
interface RawForecast {
  dates: string[]; // [today, tomorrow] in the station's local timezone
  tmax: Array<number | null>;
  tmin: Array<number | null>;
  timezone: string;
}

async function getRawForecast(station: Station): Promise<RawForecast> {
  const params = new URLSearchParams({
    latitude: String(station.lat),
    longitude: String(station.lon),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "daylight_duration",
      "shortwave_radiation_sum",
    ].join(","),
    hourly: [
      "temperature_2m",
      "dew_point_2m",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_gusts_10m",
      "pressure_msl",
      "cloud_cover",
      "shortwave_radiation",
    ].join(","),
    timezone: "auto",
    forecast_days: "2",
  });

  const data = await fetchJson(`${FORECAST_URL}?${params.toString()}`);
  const daily = data?.daily;
  if (!daily?.time?.length) {
    throw new Error("Forecast response missing daily data");
  }
  return {
    dates: daily.time,
    tmax: daily.temperature_2m_max ?? [],
    tmin: daily.temperature_2m_min ?? [],
    timezone: data.timezone ?? "auto",
  };
}

// ---- Layer 2: MOS-lite bias correction ------------------------------------
// We compare the archived model forecast (Historical Forecast API) against the
// ERA5 reanalysis "truth" (Archive API) over a ~45-day window, then subtract the
// mean bias from the live forecast. Pure arithmetic over API data, no stored model.
function toDateMap(daily: any, key: string): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const times: string[] = daily?.time ?? [];
  const values: Array<number | null> = daily?.[key] ?? [];
  times.forEach((t, i) => {
    out[t] = values[i] ?? null;
  });
  return out;
}

async function getCorrection(station: Station): Promise<CorrectionStats> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - ARCHIVE_LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (CORRECTION_WINDOW_DAYS - 1));

  const shared = {
    latitude: String(station.lat),
    longitude: String(station.lon),
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    start_date: ymd(start),
    end_date: ymd(end),
  };

  const forecastUrl = `${HISTORICAL_FORECAST_URL}?${new URLSearchParams(shared).toString()}`;
  const archiveUrl = `${ARCHIVE_URL}?${new URLSearchParams(shared).toString()}`;

  const [fc, ar] = await Promise.all([fetchJson(forecastUrl), fetchJson(archiveUrl)]);

  // High (Tmax)
  const maxAligned = alignByDate(
    toDateMap(fc.daily, "temperature_2m_max"),
    toDateMap(ar.daily, "temperature_2m_max"),
  );
  const maxStats = biasAndMae(maxAligned.forecast, maxAligned.actual);

  // Low (Tmin)
  const minAligned = alignByDate(
    toDateMap(fc.daily, "temperature_2m_min"),
    toDateMap(ar.daily, "temperature_2m_min"),
  );
  const minStats = biasAndMae(minAligned.forecast, minAligned.actual);

  const sampleDays = Math.min(maxStats.n, minStats.n);

  if (sampleDays < MIN_SAMPLE_DAYS || Number.isNaN(maxStats.bias) || Number.isNaN(minStats.bias)) {
    return {
      applied: false,
      highBias: null,
      lowBias: null,
      highMae: null,
      lowMae: null,
      sampleDays,
      note: `Not enough overlapping history (${sampleDays} days) — showing raw forecast.`,
    };
  }

  return {
    applied: true,
    highBias: maxStats.bias,
    lowBias: minStats.bias,
    highMae: maxStats.mae,
    lowMae: minStats.mae,
    sampleDays,
    note: `Bias-corrected over ${sampleDays} days (archived forecast vs ERA5 reanalysis).`,
  };
}

function emptyCorrection(note: string): CorrectionStats {
  return {
    applied: false,
    highBias: null,
    lowBias: null,
    highMae: null,
    lowMae: null,
    sampleDays: 0,
    note,
  };
}

// ---- Combine layers into a per-station result -----------------------------
export async function getStationForecast(station: Station): Promise<StationForecast> {
  const fetchedAt = new Date().toISOString();

  let raw: RawForecast;
  try {
    raw = await getRawForecast(station);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      stationId: station.id,
      city: station.city,
      airport: station.airport,
      iata: station.iata,
      ok: false,
      error: `Forecast unavailable: ${message}`,
      today: null,
      tomorrow: null,
      correction: emptyCorrection("No forecast data."),
      fetchedAt,
    };
  }

  // Layer 2 is best-effort: never let it break the card.
  let correction: CorrectionStats;
  try {
    correction = await getCorrection(station);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    correction = emptyCorrection(`Correction data unavailable (${message}) — showing raw forecast.`);
  }

  const buildDay = (i: number, label: DayLabel): DayPrediction => {
    const highRaw = raw.tmax[i] ?? null;
    const lowRaw = raw.tmin[i] ?? null;
    const highCorrected =
      correction.applied && highRaw != null && correction.highBias != null
        ? applyBias(highRaw, correction.highBias)
        : highRaw;
    const lowCorrected =
      correction.applied && lowRaw != null && correction.lowBias != null
        ? applyBias(lowRaw, correction.lowBias)
        : lowRaw;
    return {
      date: raw.dates[i] ?? "",
      label,
      highRaw,
      lowRaw,
      highCorrected,
      lowCorrected,
    };
  };

  return {
    stationId: station.id,
    city: station.city,
    airport: station.airport,
    iata: station.iata,
    ok: true,
    today: buildDay(0, "Today"),
    tomorrow: buildDay(1, "Tomorrow"),
    correction,
    fetchedAt,
  };
}

export async function getAllForecasts(stations: Station[]): Promise<StationForecast[]> {
  return Promise.all(stations.map((s) => getStationForecast(s)));
}
