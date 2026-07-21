import { getTranslations } from "next-intl/server";
import { ErrorPage } from "@/components/error-page";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <ErrorPage
      code="404"
      title={t("title")}
      message={t("message")}
      action={{ label: t("action"), href: "/" }}
    />
  );
}
