import { STATIONS } from "@/lib/stations";
import { getAllForecasts, REVALIDATE_SECONDS } from "@/lib/openMeteo";
import Dashboard from "@/components/Dashboard";

// Route-segment revalidation: the page is statically cached but never stale
// beyond 3 hours. Vercel Cron also revalidates on-demand via /api/revalidate.
export const revalidate = 10800; // = REVALIDATE_SECONDS

export default async function Page() {
  const forecasts = await getAllForecasts(STATIONS);
  // Generated at build/revalidation time; reflects the served snapshot.
  const updatedISO = new Date().toISOString();

  return (
    <Dashboard
      forecasts={forecasts}
      updatedISO={updatedISO}
      revalidateSeconds={REVALIDATE_SECONDS}
    />
  );
}
