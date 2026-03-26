"use client";

import { Truck } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex flex-col  min-h-screen items-center justify-center">
      <header className="flex h-14 w-full absolute top-0 left-0 shrink-0 items-center justify-between border-b bg-background px-4">
        <Truck className="text-orange-400" />
        <ThemeToggle />
      </header>

      <div>{children}</div>
    </main>
  );
};

export default AdminLayout;
