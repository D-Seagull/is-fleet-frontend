/**
 * Open a link outside the app (Google Maps, a file in a new tab).
 *
 * In the browser it is a normal new tab. In the desktop shell a new window
 * (`target="_blank"` / `window.open`) is ignored — nothing happened on click.
 * Navigating the page itself works there: the shell's navigation guard
 * (is-fleet-desktop `allow_navigation`) opens any foreign address in the
 * system browser and keeps the app page in place, and lets signed Supabase
 * Storage links download.
 */
export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export function openExternal(url: string): void {
  if (typeof window === "undefined") return;
  if (isDesktopShell()) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** onClick for an <a target="_blank">: in the shell, route through openExternal. */
export function externalLinkClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  url: string,
): void {
  if (!isDesktopShell()) return;
  e.preventDefault();
  openExternal(url);
}
