import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/auth/sign-out"];
const legacyAdminPaths = ["/terminal", "/products", "/inventory", "/reports", "/settings"];

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) return response;

  if (!user) {
    if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return response;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  const role = profile?.role;
  const roleHome = role === "SUPER_ADMIN" ? "/superadmin" : role === "ADMIN" ? "/admin" : "/login";

  if ((pathname === "/login" || pathname === "/") && pathname !== roleHome) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = roleHome;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  const legacyMatch = legacyAdminPaths.find((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (legacyMatch) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === "ADMIN" ? `/admin${pathname}` : roleHome;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/superadmin") && role !== "SUPER_ADMIN") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = roleHome;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = roleHome;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
