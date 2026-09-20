"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common.legal");

  return (
    <main className="flex flex-col  min-h-screen items-center justify-center">
      <header className="flex h-14 w-full absolute top-0 left-0 shrink-0 items-center justify-between border-b bg-background px-4">
        <BrandLogo className="h-[18px]" />
        <ThemeToggle />
      </header>
      <div className="w-full">{children}</div>

      {/* The only place the policy is reachable by someone who has no account
          yet — a store reviewer included. Lives in the layout rather than on
          the login page so it also covers register and password reset. */}
      <footer className="absolute bottom-0 left-0 flex w-full items-center justify-center gap-3 p-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          {t("privacy")}
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="underline-offset-4 hover:underline">
          {t("terms")}
        </Link>
      </footer>
    </main>
  );
}
