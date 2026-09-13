import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalDocument, resolveLegalLocale } from "@/components/legal-document";
import { PRIVACY } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — IS Fleet",
  description:
    "How IS Fleet handles personal data of drivers and managers.",
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const locale = resolveLegalLocale(lang, await getLocale());
  return (
    <LegalDocument doc={PRIVACY[locale]} locale={locale} path="/privacy" />
  );
}
