# Multi-City Daily High / Low Temperature Predictor

A small Next.js dashboard that shows the predicted **daily high and low temperature**
for **today** and **tomorrow** at five fixed airport stations. It refreshes itself
automatically (no manual data updates) and is built to deploy on **Vercel**.

All weather data comes from **[Open-Meteo](https://open-meteo.com/)** — free, no API
key, licensed CC BY 4.0 (attribution is shown in the page footer).

| Station | Airport | Coordinates |
| --- | --- | --- |
| London | London City Airport (LCY) | 51.5048, 0.0495 |
| Seoul | Incheon Int'l Airport (ICN) | 37.4602, 126.4407 |
| Beijing | Beijing Capital Int'l (PEK) | 40.0801, 116.5846 |
| Taipei | Taipei Songshan Airport (TSA) | 25.0697, 121.5520 |
| Paris | Paris-Le Bourget Airport (LBG) | 48.9694, 2.4414 |

---

## Tech stack

- **Next.js 14 (App Router) + TypeScript**, styled with **Tailwind CSS**.
- **All weather calls happen server-side** (in the page's Server Component and the
  data layer under `lib/`). Nothing with secrets is exposed to the browser; keeping
  fetches server-side also avoids CORS and lets Next cache the responses.
- **No database.** Freshness comes from Next.js route-segment revalidation (ISR)
  plus a **Vercel Cron** job. No paid APIs, no API keys.

---

## How it works

### Layer 1 — Raw forecast (always works, the fallback)

For each station we call the Open-Meteo **Forecast API**
(`https://api.open-meteo.com/v1/forecast`) with `timezone=auto` and `forecast_days=2`
and read `temperature_2m_max` / `temperature_2m_min` for today (index 0) and tomorrow
(index 1). This is the baseline shown if anything else fails.

We also request the richer `daily` and `hourly` fields named in the brief
(sunrise/sunset, daylight, radiation, dew point, humidity, wind, gusts, pressure,
cloud cover) so the payload is ready for a future model; Layer 1 itself only needs
max/min.

### Layer 2 — Lightweight bias correction (MOS-lite, computed online)

No stored model, no training — just arithmetic over API data, which runs fine on
serverless. For each station and each target (max, min):

1. Pull ~45 days of the **archived model forecast** for Tmax/Tmin from the
   **Historical Forecast API** (`https://historical-forecast-api.open-meteo.com/v1/forecast`).
2. Pull the **observed** Tmax/Tmin for those same days from the **ERA5 reanalysis
   Archive API** (`https://archive-api.open-meteo.com/v1/archive`).
3. Align the two series by date and compute **bias = mean(forecast − actual)**.
4. **corrected = raw_forecast − bias.**
5. Compute the rolling **MAE = mean(|forecast − actual|)** over the window and show it
   as the expected error **±X°**.

The window ends ~6 days ago so the ERA5 archive (which trails real time by ~5 days)
has data for every day compared. If fewer than ~10 overlapping days are available, or
any correction fetch fails, the card **gracefully falls back to the raw forecast** and
labels itself "raw forecast" — it never crashes.

> **Note on lead time.** The brief describes a strict "1-day-ahead at lead time = 1 day"
> series via the Previous Runs API. That API only retains the last ~7 days of previous
> runs, so for a 45-day window we use the continuously-archived Historical Forecast API
> as the forecast source. The arithmetic (bias + MAE vs. ERA5) is identical; only the
> forecast source differs. Swapping in the Previous Runs API for the most recent days is
> a drop-in change in `lib/openMeteo.ts`.

The whole correction is pure math, unit-tested offline in `test/correction.test.ts`
(`npm test`).

### Auto-update

- `app/page.tsx` sets `export const revalidate = 10800` (3 hours): the page is cached
  but never stale beyond the interval.
- `vercel.json` defines a **Vercel Cron** job that hits `/api/revalidate` every 3 hours.
- `app/api/revalidate/route.ts` calls `revalidatePath("/")`, forcing fresh Open-Meteo
  data on the next request **without a redeploy**.
- The footer shows **"Last updated: &lt;timestamp&gt;"** (the snapshot's generation time).

### UI

Responsive, mobile-friendly grid of five cards. Each card shows the station + airport
and a small grid:

|       | Today | Tomorrow |
| ----- | ----- | -------- |
| High  | corrected° | corrected° |
| Low   | corrected° | corrected° |

Under each corrected value the **raw forecast** and the **±MAE** are shown in smaller
text, so the correction is transparent. There is a **°C / °F toggle**, per-card loading
and error states, and the Open-Meteo attribution in the footer.

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build (must succeed before deploy)
npm start        # run the production build locally
npm test         # offline unit tests for the bias-correction math
```

> Requires Node 18.18+ (Node 20+ recommended).

---

## Deploy to Vercel (exact steps)

1. **Push to GitHub.**
   ```bash
   git init
   git add .
   git commit -m "Multi-city temperature predictor"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Go to **https://vercel.com/new** and **Import** the repository.
3. Vercel auto-detects Next.js. Leave the defaults:
   - Framework Preset: **Next.js**
   - Build Command: `next build` · Output: `.next` · Install: `npm install`
4. *(Optional but recommended)* Add an Environment Variable **`CRON_SECRET`** (any random
   string). When set, `/api/revalidate` only runs for callers presenting it; Vercel Cron
   sends it automatically as `Authorization: Bearer <CRON_SECRET>`.
5. Click **Deploy**. The first build provisions the **Cron Job** declared in `vercel.json`
   (`/api/revalidate` every 3 hours) automatically.
6. Open the deployment URL — all five stations show today/tomorrow high/low from live
   Open-Meteo data. To force an immediate refresh you can visit
   `https://<your-app>.vercel.app/api/revalidate` (append `?secret=<CRON_SECRET>` if set).

> Vercel Cron jobs run on Production deployments. On the Hobby plan, cron granularity is
> limited but a 3-hour schedule is supported; you can verify runs under
> **Project → Settings → Cron Jobs**.

---

## Project structure

```
app/
  api/revalidate/route.ts   # on-demand revalidation endpoint (hit by Vercel Cron)
  layout.tsx                # root layout + metadata
  loading.tsx               # route-level loading skeleton
  page.tsx                  # Server Component: fetches all stations, ISR (revalidate=10800)
  globals.css
components/
  Dashboard.tsx             # client: C/F toggle, header, grid, footer attribution
  StationCard.tsx           # client: per-station card (corrected + raw + ±MAE, error state)
lib/
  stations.ts               # the 5 fixed airport stations
  types.ts                  # shared types
  openMeteo.ts              # server-side fetching: Layer 1 raw + Layer 2 correction
  correction.ts             # pure bias/MAE arithmetic (unit-tested)
  format.ts                 # °C/°F conversion + formatting
test/correction.test.ts     # offline unit tests (npm test)
vercel.json                 # Vercel Cron: /api/revalidate every 3h
```

---

## Roadmap — v2 upgrade path (out of scope for v1)

v1 deliberately ships **no trained model, no Python service, no separate training job**.
The natural v2 upgrade keeps the serverless deploy but adds a real per-station MOS model:

1. A scheduled **GitHub Actions** job trains a small per-station model (e.g. **LightGBM**)
   on Open-Meteo's **Historical Forecast archive** (forecast features) vs. **ERA5**
   (observed Tmax/Tmin) — using the same data this app already reads, just over a longer
   history and with more predictors (radiation, cloud cover, wind, dew point, pressure).
2. The job writes a small **model artifact** (e.g. JSON/ONNX) into the repo or object
   storage.
3. A **serverless inference function** loads that artifact at request time and replaces
   the Layer-2 arithmetic with model predictions, while Layer 1 stays as the fallback.

Because Layer 2 is already isolated in `lib/openMeteo.ts` / `lib/correction.ts`, swapping
the arithmetic for model inference is a localized change.

---

## Attribution

Weather data by **[Open-Meteo.com](https://open-meteo.com/)**, licensed under
**CC BY 4.0**.
