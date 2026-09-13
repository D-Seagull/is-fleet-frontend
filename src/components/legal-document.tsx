import Link from "next/link";
import type { LegalDoc, LegalLocale } from "@/content/legal";

/**
 * Splits prose on `[PLACEHOLDER]` markers and renders them highlighted, so a
 * document that still carries unfilled company details is impossible to miss
 * on the page — including for whoever does the final pre-submission read.
 */
function withPlaceholders(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <mark
        key={i}
        className="rounded bg-amber-200 px-1 font-medium text-amber-950 dark:bg-amber-400/30 dark:text-amber-100"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function LegalDocument({
  doc,
  locale,
  path,
}: {
  doc: LegalDoc;
  locale: LegalLocale;
  /** This document's own route, used to build the language links. */
  path: string;
}) {
  const other: LegalLocale = locale === "uk" ? "en" : "uk";
  const otherLabel = other === "uk" ? "Українська" : "English";

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-3 border-b pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
          <Link
            href={`${path}?lang=${other}`}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {otherLabel}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {withPlaceholders(doc.updated)}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {doc.intro.map((p, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {withPlaceholders(p)}
          </p>
        ))}
      </div>

      {doc.sections.map((section, i) => (
        <section key={i} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.paragraphs?.map((p, j) => (
            <p key={j} className="leading-relaxed">
              {withPlaceholders(p)}
            </p>
          ))}
          {section.bullets && (
            <ul className="flex list-disc flex-col gap-2 pl-5">
              {section.bullets.map((b, j) => (
                <li key={j} className="leading-relaxed">
                  {withPlaceholders(b)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

/** Resolves the document language: explicit `?lang=` wins, else the UI locale,
 *  and anything we don't publish a translation for falls back to English —
 *  which is also what a store reviewer will be reading. */
export function resolveLegalLocale(
  langParam: string | undefined,
  uiLocale: string,
): LegalLocale {
  if (langParam === "uk" || langParam === "en") return langParam;
  return uiLocale === "uk" ? "uk" : "en";
}
