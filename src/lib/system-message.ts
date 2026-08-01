/**
 * System chat messages (driver/manager reassigned, etc.) are persisted once
 * but shown to participants who may each use a different UI language. The
 * backend stores them as `[[sys]]{"k":"<key>","p":{...params}}` so every
 * client localizes them at render time. Legacy plain-text system messages
 * (no prefix) render exactly as stored.
 *
 * `t` is a next-intl translator scoped to the `chat` namespace, so the stored
 * key `sys.driverAssigned` resolves to `chat.sys.driverAssigned`.
 */
const PREFIX = "[[sys]]";

export function systemMessageText(
  content: string,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  if (!content.startsWith(PREFIX)) return content;
  try {
    const { k, p } = JSON.parse(content.slice(PREFIX.length)) as {
      k: string;
      p?: Record<string, string>;
    };
    return t(k, p ?? {});
  } catch {
    return content;
  }
}
