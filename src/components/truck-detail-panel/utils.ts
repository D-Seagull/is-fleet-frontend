export function shortenTripTitle(title: string): string {
  const [from, to] = title.split(" → ");
  const shortFrom = from?.split(",")[0]?.trim() ?? from ?? "";
  const shortTo = to?.split(",")[0]?.trim() ?? to ?? "";
  return to ? `${shortFrom} → ${shortTo}` : shortFrom;
}

// Витягує "CC поштовий_індекс" з адреси
// "Zabka\nMaslcka\npl 51-106"          → "PL 51-106"
// "Polcher Str. 113, DE-56727 Mayen"   → "DE 56727"
// "Lancaster Way, GB-CB6 3NW Ely"      → "GB CB6 3NW"
// "Some Street, 56727 Mayen"           → "56727"  (без коду країни)
export function extractPostcodeCity(address: string): string {
  // Шукаємо: опційний код країни (2 літери) + роздільник + поштовий індекс
  const patterns: RegExp[] = [
    /\b([A-Z]{2})[-\s](\d{2}-\d{3})\b/i, // PL: pl 51-106 / PL-51-106
    /\b([A-Z]{2})[-\s]([A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})\b/i, // GB: GB-CB6 3NW
    /\b([A-Z]{2})[-\s](\d{4,6})\b/i, // DE/AT/FR: DE-56727
    /\b(\d{2}-\d{3})\b/, // PL без коду: 51-106
    /\b([A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})\b/i, // UK без коду: CB6 3NW
    /\b(\d{4,6})\b/, // DE/FR без коду: 56727
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (!match) continue;
    // Якщо є дві групи — це "країна + індекс"
    if (match[2]) return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
    // Інакше просто індекс
    return match[1].toUpperCase();
  }

  // fallback
  const parts = address
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] ?? address;
  return last.replace(/^[a-z]{1,3}[-\s]/i, "").trim();
}
