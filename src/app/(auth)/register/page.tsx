"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await api.post("/auth/register", form);
      router.push("/login");
    } catch (err: any) {
      console.log(err.response?.data);
      setError(err.response?.data?.message?.message ?? "Помилка реєстрації");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen min-w-screen flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Реєстрація</CardTitle>
          <CardDescription>Створіть акаунт для вашої компанії</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Ваше ім'я</Label>
              <Input
                id="name"
                name="name"
                placeholder="Іван Іваненко"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="companyName">Назва компанії</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="ТОВ Логістика"
                value={form.companyName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Мінімум 6 символів"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Реєстрація...
                </>
              ) : (
                "Зареєструватись"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Вже маєте акаунт?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Увійти
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
