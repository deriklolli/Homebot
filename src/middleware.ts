import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() instead of getSession() for security —
  // getUser() validates the token with the Supabase auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Unauthenticated users get redirected to /login
  if (
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/activate")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = (user.app_metadata?.role as string) ?? "homeowner";

    // Authenticated users visiting /login or /signup get redirected based on role
    if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
      const url = request.nextUrl.clone();
      url.pathname = role === "superadmin" ? "/superadmin" : role === "manager" ? "/admin" : "/";
      return NextResponse.redirect(url);
    }

    // Block non-superadmins from /superadmin routes
    if (pathname.startsWith("/superadmin") && role !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Block non-managers from /admin routes (superadmins can also access)
    if (pathname.startsWith("/admin") && role !== "manager" && role !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Redirect un-activated managed accounts to /activate
    if (
      user.app_metadata?.managed_by &&
      !user.app_metadata?.activated &&
      !pathname.startsWith("/activate") &&
      !pathname.startsWith("/auth/callback")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/activate";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static assets (svg, png, jpg, etc.)
     * - API routes (calendar feed, SMS alerts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
