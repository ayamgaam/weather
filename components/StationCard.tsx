"use client";

import { StationForecast, DayPrediction } from "@/lib/types";
import { Unit, fmtTemp, fmtDelta } from "@/lib/format";

function Cell({
  corrected,
  raw,
  mae,
  applied,
  unit,
}: {
  corrected: number | null;
  raw: number | null;
  mae: number | null;
  applied: boolean;
  unit: Unit;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-1">
      <div className="text-2xl font-semibold tabular-nums leading-none text-slate-900 dark:text-slate-50">
        {fmtTemp(corrected, unit, 0)}
      </div>
      <div className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
        {applied ? (
          <>
            raw {fmtTemp(raw, unit, 1)}
            {mae != null && <> &middot; {fmtDelta(mae, unit)}</>}
          </>
        ) : (
          <span>raw forecast</span>
        )}
      </div>
    </div>
  );
}

function DayHeader({ day }: { day: DayPrediction | null }) {
  return (
    <div className="text-center text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {day?.label ?? ""}
    </div>
  );
}

export default function StationCard({
  forecast,
  unit,
}: {
  forecast: StationForecast;
  unit: Unit;
}) {
  const { city, airport, iata, ok, error, today, tomorrow, correction } = forecast;

  return (
    <section
      className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70"
      aria-label={`${city} forecast`}
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{city}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{airport}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {iata}
        </span>
      </header>

      {!ok || !today || !tomorrow ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-rose-300 bg-rose-50 px-3 py-8 text-center text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
          {error ?? "Forecast unavailable. Please try again later."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1">
            {/* header row */}
            <div />
            <DayHeader day={today} />
            <DayHeader day={tomorrow} />

            {/* High row */}
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">High</div>
            <Cell corrected={today.highCorrected} raw={today.highRaw} mae={correction.highMae} applied={correction.applied} unit={unit} />
            <Cell corrected={tomorrow.highCorrected} raw={tomorrow.highRaw} mae={correction.highMae} applied={correction.applied} unit={unit} />

            {/* divider */}
            <div className="col-span-3 my-1 h-px bg-slate-100 dark:bg-slate-700" />

            {/* Low row */}
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Low</div>
            <Cell corrected={today.lowCorrected} raw={today.lowRaw} mae={correction.lowMae} applied={correction.applied} unit={unit} />
            <Cell corrected={tomorrow.lowCorrected} raw={tomorrow.lowRaw} mae={correction.lowMae} applied={correction.applied} unit={unit} />
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-tight text-slate-400 dark:text-slate-500">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                correction.applied ? "bg-emerald-500" : "bg-amber-500"
              }`}
              aria-hidden
            />
            {correction.note}
          </p>
        </>
      )}
    </section>
  );
}
