/**
 * Is the user actually looking at the page: tab visible AND window focused?
 * Visibility alone stays "visible" for the desktop app (or a browser window)
 * left open beside / behind other windows — read receipts then flipped to ✓✓
 * for messages nobody read. Gate every "mark as read" on this, and catch up
 * on the window's `focus` / `visibilitychange`.
 */
export function isLooking(): boolean {
  return (
    typeof document === "undefined" ||
    (document.visibilityState === "visible" && document.hasFocus())
  );
}
