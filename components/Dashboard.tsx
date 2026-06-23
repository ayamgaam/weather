"use client";

import { useState } from "react";
import { StationForecast } from "@/lib/types";
import { Unit } from "@/lib/format";
import StationCard from "./StationCard";

function UnitToggle({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div
      role="group"
      aria-label="Temperature unit"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      {(["C", "F"] as Unit[]).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          aria-pressed={unit === u}
          className={`rounded-md px-3 py-1 transition ${
            unit === u
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          °{u}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard({
  forecasts,
  updatedISO,
  revalidateSeconds,
}: {
  forecasts: StationForecast[];
  updatedISO: string;
  revalidateSeconds: number;
}) {
  const [unit, setUnit] = useState<Unit>("C");

  // Deterministic on server and client (UTC) to avoid hydration mismatches.
  const updatedLabel = new Date(updatedISO).toUTCString();
  const refreshHours = Math.round(revalidateSeconds / 3600);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Daily High / Low Predictor
          </h1>
          <p className="mt-1 max-w-prose text-sm text-slate-500 dark:text-slate-400">
            Predicted high and low temperatures for today and tomorrow across five airport
            stations. Corrected values apply a lightweight rolling bias correction; the raw
            forecast and expected error (±MAE) are shown for transparency.
          </p>
        </div>
        <UnitToggle unit={unit} onChange={setUnit} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forecasts.map((f) => (
          <StationCard key={f.stationId} forecast={f} unit={unit} />
        ))}
      </div>

      <footer className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:flex-row sm:items-center">
        <span>
          Last updated: {updatedLabel} &middot; refreshes every {refreshHours}h
        </span>
        <span>
          Weather data by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-slate-700 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Open-Meteo.com
          </a>{" "}
          (CC BY 4.0)
        </span>
      </footer>
    </main>
  );
}
