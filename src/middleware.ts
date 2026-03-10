import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    // Préserver le pathname + query string (ex: /property/new?url=...)
    const callbackUrl = req.nextUrl.pathname + req.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/property/new"],
};
