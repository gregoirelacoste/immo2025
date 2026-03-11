import { auth } from "@/lib/auth";

// Middleware: only attaches session to request, never redirects.
// Auth checks are handled by individual pages/actions.
export default auth(() => {
  // No redirect — all routes are accessible
});

export const config = {
  // Only run middleware on pages that need session info, skip static/api
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json|api/auth).*)"],
};
