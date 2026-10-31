/**
 * Client-side feature switches (build-time env). A feature that also has a
 * backend switch shows only when both are on — see useAuthFeatures.
 */

/** Managers mint a sign-in code on the driver page. Default off. */
export const MANAGER_LOGIN_CODE_ENABLED =
  process.env.NEXT_PUBLIC_MANAGER_LOGIN_CODE_ENABLED === "true";
