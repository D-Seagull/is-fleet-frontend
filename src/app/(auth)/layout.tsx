"use client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Truck } from "lucide-react";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col  min-h-screen items-center justify-center">
      <header className="flex h-14 w-full absolute top-0 left-0 shrink-0 items-center justify-between border-b bg-background px-4">
        <Truck className="text-orange-400" />
        <ThemeToggle />
      </header>
      <div className="w-full">{children}</div>
    </main>
  );
}
