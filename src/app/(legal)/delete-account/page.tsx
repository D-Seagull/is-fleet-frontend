import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalDocument, resolveLegalLocale } from "@/components/legal-document";
import { DELETE_ACCOUNT } from "@/content/legal";

// Google Play requires this URL to be reachable without installing the app,
// and it is submitted separately from the privacy policy URL.
export const metadata: Metadata = {
  title: "Delete your account — IS Fleet",
  description:
    "How to delete an IS Fleet account and what happens to your data.",
};

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const locale = resolveLegalLocale(lang, await getLocale());
  return (
    <LegalDocument
      doc={DELETE_ACCOUNT[locale]}
      locale={locale}
      path="/delete-account"
    />
  );
}
