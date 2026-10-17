/**
 * "Is this window in use?" — the web / desktop half of the push rule: while
 * the person works in IS Fleet here, their phone stays quiet; once they stop,
 * it rings again.
 *
 * In use = the window is visible, focused, and was touched (mouse, keys,
 * scroll, touch) within IDLE_MS. A desktop left open on an empty desk, a
 * window behind other apps or a minimized one does NOT count. While in use
 * the app pulses `appActive { pulse }` every PULSE_MS; the server trusts a
 * pulse for 45 s, so the phone resumes ringing within a minute of leaving.
 */
export const PULSE_MS = 15_000;
export const IDLE_MS = 2 * 60_000;

export function isWindowInUse(s: {
  visible: boolean;
  focused: boolean;
  lastInputAt: number;
  now: number;
}): boolean {
  return s.visible && s.focused && s.now - s.lastInputAt < IDLE_MS;
}
