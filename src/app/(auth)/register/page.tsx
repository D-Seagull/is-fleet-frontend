"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Truck, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
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
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface InviteInfo {
  type: "user" | "company";
  role: "TEAMLEAD" | "MANAGER" | "DRIVER" | "ADMIN";
  companyName: string;
  isFirstUser: boolean;
}

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const login = useAuthStore((s) => s.login);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [accountingEmail, setAccountingEmail] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 1) Validate the token on mount — surfaces immediate "Invalid/expired"
  // instead of letting the user fill the form before learning the truth.
  useEffect(() => {
    if (!token) {
      setCheckError("Token is missing in the URL.");
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setCheckError(null);
    api
      .get<InviteInfo>(`/auth/invite/${token}`)
      .then((res) => {
        if (!cancelled) setInvite(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          (err?.response?.data?.message as string | undefined) ??
          "Invalid or expired invite token.";
        setCheckError(typeof msg === "string" ? msg : "Invalid invite token.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !token || !invite) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: Record<string, string> = {
        inviteToken: token,
        password,
        name,
      };
      // Email is set on the User row already for `user` invites — backend
      // ignores it there. For company invites the TEAMLEAD must provide one.
      if (invite.type === "company") {
        payload.email = email;
        if (invite.isFirstUser) {
          if (accountingEmail) payload.accountingEmail = accountingEmail;
          if (hrEmail) payload.hrEmail = hrEmail;
          if (directorEmail) payload.directorEmail = directorEmail;
        }
      }

      const res = await api.post("/auth/register", payload);
      const { access_token, user } = res.data as {
        access_token: string;
        user: { id: string; role: string; companyId: string; name: string };
      };

      login(user, access_token, true);

      router.push(
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "MANAGER"
            ? "/my-trucks"
            : "/trucks",
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      if (Array.isArray(msg)) setError(msg.join(", "));
      else if (typeof msg === "string") setError(msg);
      else setError("Registration failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <CenterCard>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </CenterCard>
    );
  }

  if (checkError || !invite) {
    return (
      <CenterCard>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldCheck className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Invite invalid</CardTitle>
          <CardDescription>{checkError ?? "Unknown error."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Go to login
          </Button>
        </CardContent>
      </CenterCard>
    );
  }

  const roleLabel =
    invite.role === "TEAMLEAD"
      ? "Team Lead"
      : invite.role === "MANAGER"
        ? "Manager"
        : invite.role === "DRIVER"
          ? "Driver"
          : invite.role;

  return (
    <CenterCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Truck className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Join {invite.companyName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as <b>{roleLabel}</b>. Set up your account
          below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Іван Петренко"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {invite.type === "company" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password2">Confirm password</Label>
            <Input
              id="password2"
              autoComplete="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat the password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {invite.type === "company" && invite.isFirstUser && (
            <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium">
                Company contacts (optional)
              </p>
              <p className="text-xs text-muted-foreground -mt-1">
                Used as default recipients for advance requests, HR
                notifications, etc. You can change these later in Settings.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="accountingEmail" className="text-xs">
                  Accounting email
                </Label>
                <Input
                  id="accountingEmail"
                  type="email"
                  placeholder="accounting@company.com"
                  value={accountingEmail}
                  onChange={(e) => setAccountingEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="hrEmail" className="text-xs">
                  HR email
                </Label>
                <Input
                  id="hrEmail"
                  type="email"
                  placeholder="hr@company.com"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="directorEmail" className="text-xs">
                  Director email
                </Label>
                <Input
                  id="directorEmail"
                  type="email"
                  placeholder="director@company.com"
                  value={directorEmail}
                  onChange={(e) => setDirectorEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm self-center"
            onClick={() => router.push("/login")}
          >
            Already have an account? Sign in
          </Button>
        </form>
      </CardContent>
    </CenterCard>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full flex items-center justify-center px-2 sm:px-6">
      <Card className="w-full max-w-md sm:max-w-lg">{children}</Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <CenterCard>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CenterCard>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}
