import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { betaAllowed } from "@/lib/beta";

/** Keeps the Supabase session fresh and protects /dashboard. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response; // demo mode, no Supabase yet

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let user: { email?: string | null } | null = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    // Supabase unreachable: treat as signed out instead of failing every page.
  }
  const path = request.nextUrl.pathname;

  // Private beta: anyone can request a sign-in link straight from Supabase, so check the invite list here too.
  if (user && !betaAllowed(user.email)) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "SubTrack is in private beta." }, { status: 403 });
    if (path !== "/" && !path.startsWith("/privacy") && !path.startsWith("/demo")) {
      return NextResponse.redirect(new URL("/?error=invite", request.url));
    }
    return response;
  }

  if (!user && ["/dashboard", "/upcoming", "/settings"].some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo|api/cron|api/logo|api/calendar|sw.js|manifest.webmanifest|icons).*)"],
};
