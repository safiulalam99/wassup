import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Force Node.js runtime for middleware (Better Auth needs crypto module)
export const runtime = "nodejs"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname === "/"

  // API auth routes are public
  const isAuthApiRoute = pathname.startsWith("/api/auth")

  // Webhook routes should bypass auth (they come from external services)
  const isWebhookRoute = pathname.startsWith("/api/webhooks")

  // Skip auth check for public routes, auth API, and webhooks
  if (isPublicRoute || isAuthApiRoute || isWebhookRoute) {
    return NextResponse.next()
  }

  // Get session
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isLoggedIn = !!session

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to dashboard if authenticated user tries to access login/register
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = new URL("/dashboard", request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/((?!auth).*)",
    "/login",
    "/register",
    "/",
  ],
}
