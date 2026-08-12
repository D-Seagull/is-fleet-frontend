"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Truck, Eye, EyeOff, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { writeUiLocaleCookie, type UiLocaleDb } from "@/lib/ui-locale";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
        remember: rememberMe,
      });
      const { access_token, user } = res.data;

      login(user, access_token, rememberMe);
      const uiLocale = user.uiLocale as UiLocaleDb | undefined;
      if (uiLocale) writeUiLocaleCookie(uiLocale);
      router.push(user.role === "ADMIN" ? "/admin" : user.role === "MANAGER" ? "/my-trucks" : "/trucks");
    } catch (err: any) {
      console.log(err.response?.data);
      const msg = err.response?.data?.message.message;
      if (Array.isArray(msg)) {
        setError(msg.join(", "));
      } else if (typeof msg === "string") {
        setError(msg);
      } else {
        setError(t("errorInvalidCredentials"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full flex items-center justify-center px-2 sm:px-6">
      <Card className="w-full max-w-md sm:max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  {t("rememberMe")}
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
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
                  {t("submitLoading")}
                </>
              ) : (
                t("submitButton")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
