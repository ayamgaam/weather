import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Hit by Vercel Cron every 3 hours (see vercel.json). Forces the home page to
// re-fetch fresh Open-Meteo data on the next request without a redeploy.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // If CRON_SECRET is configured, require it. Vercel Cron sends it as a Bearer
  // token automatically; manual callers can pass ?secret=... instead.
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const authorized = authHeader === `Bearer ${secret}` || querySecret === secret;
    if (!authorized) {
      return NextResponse.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: new Date().toISOString() });
}
