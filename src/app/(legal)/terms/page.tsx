import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalDocument, resolveLegalLocale } from "@/components/legal-document";
import { TERMS } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of Service — IS Fleet",
  description: "Terms governing use of the IS Fleet system.",
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const locale = resolveLegalLocale(lang, await getLocale());
  return <LegalDocument doc={TERMS[locale]} locale={locale} path="/terms" />;
}
