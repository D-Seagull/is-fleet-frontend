"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type ErrorAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

interface ErrorPageProps {
  code: string;
  title: string;
  message: string;
  action: ErrorAction;
}

// Shared frame for the 404 and 500 pages. The illustration is a raster
// image kept in /public so both routes share it — swap the file to
// re-skin both screens at once.
export function ErrorPage({ code, title, message, action }: ErrorPageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-7xl sm:text-8xl font-black tracking-tight leading-none">
        {code}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/broken-road-errorpict.png"
        alt=""
        className="w-72 sm:w-96 h-auto object-contain"
      />


      <div className="space-y-1 max-w-md">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {action.href ? (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </main>
  );
}
