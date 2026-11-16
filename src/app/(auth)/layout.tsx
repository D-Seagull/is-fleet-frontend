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
    <main className="relative flex min-h-screen flex-col items-center pt-14">
      <header className="absolute left-0 top-0 flex h-14 w-full shrink-0 items-center justify-between border-b bg-background px-4">
        <BrandLogo className="h-[16.2px]" />
        <ThemeToggle />
      </header>
      <div className="flex w-full flex-1 flex-col justify-center py-6">
        {children}
      </div>

      {/* The only place the policy is reachable by someone who has no account
          yet — a store reviewer included. Lives in the layout rather than on
          the login page so it also covers register and password reset. */}
      <footer className="flex w-full shrink-0 items-center justify-center gap-3 p-4 text-xs text-muted-foreground">
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
