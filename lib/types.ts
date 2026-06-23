export type DayLabel = "Today" | "Tomorrow";

export interface DayPrediction {
  /** Local ISO date (yyyy-mm-dd) for the station's timezone. */
  date: string;
  label: DayLabel;
  /** Raw Open-Meteo forecast in degrees Celsius (Layer 1). */
  highRaw: number | null;
  lowRaw: number | null;
  /** Bias-corrected value in degrees Celsius (Layer 2). Equals raw when no correction applied. */
  highCorrected: number | null;
  lowCorrected: number | null;
}

export interface CorrectionStats {
  applied: boolean;
  /** mean(forecast - actual) over the window, in degrees Celsius. */
  highBias: number | null;
  lowBias: number | null;
  /** rolling mean absolute error of the raw forecast, shown as +/- X degrees. */
  highMae: number | null;
  lowMae: number | null;
  sampleDays: number;
  note: string;
}

export interface StationForecast {
  stationId: string;
  city: string;
  airport: string;
  iata: string;
  /** false => the raw forecast itself could not be fetched; render an error card. */
  ok: boolean;
  error?: string;
  today: DayPrediction | null;
  tomorrow: DayPrediction | null;
  correction: CorrectionStats;
  /** ISO timestamp of when this station's data was assembled. */
  fetchedAt: string;
}
