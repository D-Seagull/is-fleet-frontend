import Link from "next/link";
import {
  LEGAL_LOCALE_NAMES,
  LEGAL_LOCALES,
  type LegalDoc,
  type LegalLocale,
} from "@/content/legal";
import { cn } from "@/lib/utils";

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
  return (
    <article lang={locale} className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-4 border-b pb-6">
        {/* Every app language, each named in itself, so a reader who landed
            on the wrong one can find theirs without reading the current one. */}
        <nav aria-label="Language" className="flex flex-wrap gap-1.5">
          {LEGAL_LOCALES.map((l) => (
            <Link
              key={l}
              href={`${path}?lang=${l}`}
              lang={l}
              aria-current={l === locale ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                l === locale
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {LEGAL_LOCALE_NAMES[l]}
            </Link>
          ))}
        </nav>
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
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

const isLegalLocale = (v: string | undefined): v is LegalLocale =>
  !!v && (LEGAL_LOCALES as readonly string[]).includes(v);

/** Resolves the document language: explicit `?lang=` wins (the mobile apps
 *  pass theirs), else the UI locale, and anything else falls back to English —
 *  which is also what a store reviewer will be reading. */
export function resolveLegalLocale(
  langParam: string | undefined,
  uiLocale: string,
): LegalLocale {
  if (isLegalLocale(langParam)) return langParam;
  return isLegalLocale(uiLocale) ? uiLocale : "en";
}
