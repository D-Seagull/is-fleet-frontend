"use client";

import { FC, Suspense, useState, useEffect } from "react";
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
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

const RegisterForm: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isFirst, setIsFirst] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    accountingEmail: "",
    hrEmail: "",
    directorEmail: "",
  });

  // Перевіряємо токен при завантаженні
  useEffect(() => {
    if (!inviteToken) {
      setIsCheckingToken(false);
      return;
    }

    api
      .get(`/auth/invite/${inviteToken}`)
      .then((res) => {
        setCompanyName(res.data.companyName);
        setIsFirst(res.data.isFirstUser);
      })
      .catch(() => {
        setError("Невалідне або прострочене посилання");
      })
      .finally(() => setIsCheckingToken(false));
  }, [inviteToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  console.log(isFirst);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        inviteToken,
        // відправляємо тільки якщо перша реєстрація
        ...(isFirst && {
          accountingEmail: form.accountingEmail,
          hrEmail: form.hrEmail,
          directorEmail: form.directorEmail,
        }),
      });
      router.push("/login");
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.message ?? err.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(", "));
      } else if (typeof msg === "string") {
        setError(msg);
      } else {
        setError("Помилка реєстрації");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!inviteToken) return <InvalidInvite />;

  if (isCheckingToken) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Перевірка запрошення...
      </div>
    );
  }

  return (
    <div className="relative w-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Реєстрація</CardTitle>
          <CardDescription>
            {companyName
              ? `Приєднатись до ${companyName}`
              : "Створіть свій акаунт"}
          </CardDescription>
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

            {/* Додаткові поля тільки для першого тімліда */}
            {isFirst && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Ви перший в компанії — вкажіть контактні email
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="accountingEmail">Email бухгалтерії</Label>
                      <Input
                        id="accountingEmail"
                        name="accountingEmail"
                        type="email"
                        placeholder="accounting@company.com"
                        value={form.accountingEmail}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="hrEmail">Email HR</Label>
                      <Input
                        id="hrEmail"
                        name="hrEmail"
                        type="email"
                        placeholder="hr@company.com"
                        value={form.hrEmail}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="directorEmail">Email директора</Label>
                      <Input
                        id="directorEmail"
                        name="directorEmail"
                        type="email"
                        placeholder="director@company.com"
                        value={form.directorEmail}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

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
