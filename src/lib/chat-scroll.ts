/**
 * Message lists scroll in a `flex-col-reverse` container, which the browser
 * anchors to the BOTTOM: a chat opens on its newest message with no scroll
 * animation, and content growing above the view (an older page, a photo
 * finishing loading) doesn't move what the reader is looking at.
 *
 * In such a container scrollTop is 0 at the bottom and negative going up.
 */

/** How far the reader is from the newest message, in px. */
export function distanceFromLatest(el: HTMLElement): number {
  return Math.abs(el.scrollTop);
}

export function scrollToLatest(
  el: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  el.scrollTo({ top: 0, behavior });
}

function flash(el: HTMLElement) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary", "rounded-lg");
  setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary", "rounded-lg");
  }, 1500);
}

/** Resolves the element once React has rendered it, or null after `ms`. */
function waitForElement(id: string, ms: number): Promise<HTMLElement | null> {
  const started = performance.now();
  return new Promise((resolve) => {
    const check = () => {
      const el = document.getElementById(id);
      if (el || performance.now() - started > ms) resolve(el);
      else requestAnimationFrame(check);
    };
    check();
  });
}

// Pages loaded at most while looking for a quoted message (≈ 30 × page size).
const MAX_PAGES = 30;

/**
 * Scrolls to element `id` (a message / file bubble) and flashes it. When it
 * isn't rendered — the quoted message is older than the loaded pages — older
 * pages are fetched until it shows up. Resolves false if it never does
 * (deleted, or beyond MAX_PAGES).
 */
export async function revealInChat(
  id: string,
  loadOlder?: () => Promise<{ hasNextPage: boolean }>,
): Promise<boolean> {
  let el = document.getElementById(id);
  for (let page = 0; !el && loadOlder && page < MAX_PAGES; page++) {
    const { hasNextPage } = await loadOlder();
    el = await waitForElement(id, 500);
    if (!el && !hasNextPage) break;
  }
  if (!el) return false;
  flash(el);
  return true;
}
