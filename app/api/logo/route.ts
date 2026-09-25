import { NextResponse } from "next/server";

/**
 * Company logo for a subscription, e.g. /api/logo?d=netflix.com
 * Serves the company's own website icon (via Google's favicon service), cached for a week.
 * Going through our server keeps the list of your subscriptions private from the logo service's cookies
 * and lets browsers cache logos across the app.
 */
export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get("d")?.toLowerCase() ?? "";
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d) || d.length > 100) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return new NextResponse(null, { status: 404 });
    return new NextResponse(await res.arrayBuffer(), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
