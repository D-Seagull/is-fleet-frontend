/**
 * Route visibility, shared by the two guards that enforce it: `src/proxy.ts`
 * (server-side redirect) and `src/components/auth-provider.tsx` (client-side).
 * They used to keep separate copies of the same list — one module so they
 * cannot drift apart.
 */

/**
 * Sign-in flow. Reachable while signed out; a signed-in visitor is bounced
 * into the app, since there is nothing for them to do here.
 */
export const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

/**
 * Legal and store-compliance pages. Reachable by *everyone*, always — signed
 * in or not. Google Play and the App Store require the privacy policy and the
 * account-deletion instructions to be readable by a reviewer who never signs
 * in (and never installs the app), so these must never redirect: not to
 * /login when signed out, and not into the app when signed in.
 */
export const OPEN_ROUTES = ["/privacy", "/terms", "/delete-account"];

/** True for a path that must render without any authentication check. */
export function isOpenRoute(pathname: string): boolean {
  return OPEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
