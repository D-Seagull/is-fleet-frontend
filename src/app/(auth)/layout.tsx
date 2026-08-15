"use client";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col  min-h-screen items-center justify-center">
      <header className="flex h-14 w-full absolute top-0 left-0 shrink-0 items-center justify-between border-b bg-background px-4">
        <BrandLogo className="h-8" />
        <ThemeToggle />
      </header>
      <div className="w-full">{children}</div>
    </main>
  );
}
