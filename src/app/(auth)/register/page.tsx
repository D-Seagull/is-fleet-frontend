"use client";

import { FC, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import InvalidInvite from "@/components/invalid-invite";

export default function RegisterPage() {
  return <RegisterForm />;
}
const RegisterForm: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token"); // читаємо токен з URL

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!inviteToken) {
      setError("Невалідне посилання для реєстрації");
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/auth/register", {
        ...form,
        inviteToken,
      });
      router.push("/login");
    } catch (err: any) {
      const msg = err.response?.data?.message.message;
      if (Array.isArray(msg)) {
        setError(msg.join(", "));
      } else if (typeof msg === "string") {
        setError(msg);
      } else {
        setError("Помилка реєстрації");
      }
    } finally {
      console.log(error);
      setIsLoading(false);
    }
  };

  // Якщо немає токена — показуємо помилку

  if (!inviteToken) return <InvalidInvite />;

  return (
    <div className="relative  w-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Реєстрація</CardTitle>
          <CardDescription>Створіть свій акаунт</CardDescription>
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
};
