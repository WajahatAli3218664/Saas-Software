import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Everything the marketing site and the auth flow need, signed in or not. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

/** Reachable while signed in but before a clinic exists. */
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, orgId, redirectToSignIn } = await auth();

  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  // Signed in but no clinic yet — everything funnels to onboarding, which is
  // the only place a clinic gets created.
  if (!orgId && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Onboarding is finished; don't let a completed user loop back into it.
  if (orgId && isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless they appear in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
